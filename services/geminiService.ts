
import { GoogleGenAI, Type } from "@google/genai";
import { BarrelData } from '../types';

// This function converts a File object to a base64 encoded string.
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            resolve(''); // Or handle error appropriately
        }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};


export const analyzeImageForTable = async (imageFile: File): Promise<BarrelData> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = await fileToGenerativePart(imageFile);

  const prompt = `
    Your task is to be a meticulous data extraction expert. Analyze the provided image containing fragmented tables for oak barrel volumes and consolidate all data into a single, structured JSON array of objects.

    Follow these rules with absolute precision:

    1.  **Structure:** The final output must be a single JSON array. Each object in the array represents one horizontal row from the combined logical table.

    2.  **Cell Structure:** Every value in each row object MUST be another object with two keys:
        - \`"value"\`: The transcribed number from the table cell, or \`null\` if the cell is empty.
        - \`"confidence"\`: A string indicating your confidence in the transcription. Use \`'high'\` for clear numbers, \`'medium'\` for slightly blurry or ambiguous digits, and \`'low'\` for very hard-to-read numbers.

    3.  **Primary Key:** The "Mouillé" (wet height) column is the primary identifier. The key in your JSON objects MUST be exactly "Mouillé". Its value should also be a cell object like \`{ "value": 10, "confidence": "high" }\`.

    4.  **Column Headers (Keys):**
        - Create a unique key for each volume column by combining the capacity ("Fûts de...") and diameter ("Diam. sous bonde").
        - **Format:** \`{Capacity}L_Diam{Diameter}\`.
        - **Examples:** "390L_Diam80", "400L_Diam81", "420L_Diam84".

    5.  **Data Merging:** Merge rows from different physical tables if they share the same "Mouillé" value.

    6.  **CRITICAL - Handling Missing Data & Alignment:**
        - **Maintain Strict Column Integrity:** The position of a value is crucial.
        - **Do Not Shift Data:** If a cell in the table is empty, contains a dot (.), or a dash (-), the \`"value"\` in its cell object MUST be \`null\`. DO NOT shift data from a column on the right to fill an empty cell on the left.
        - **Pay Special Attention to Table Endings:** The tables often end with sparse data. Continue processing rows as long as there is at least ONE value for that "Mouillé" number. A row like "Mouillé: 86" in the "Fûts de 390 litres" table must be represented accurately:
          \`... "390L_Diam80": { "value": null, "confidence": "high" }, "390L_Diam82": { "value": null, "confidence": "high" }, "390L_Diam84": { "value": null, "confidence": "high" }, "390L_Diam86": { "value": 390, "confidence": "high" } ...\`

    7.  **Data Types:** All volume and "Mouillé" values should be transcribed as JSON numbers.

    8.  **Final Output Format:** The response MUST be only the raw JSON array. Do not include any text, explanations, or code block formatting (like \`\`\`json).
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: {
          parts: [
            { text: prompt },
            imagePart,
          ]
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 32768 },
      },
    });

    const jsonText = response.text.trim();
    // In case the model still wraps the output in markdown
    const sanitizedJsonText = jsonText.replace(/^```json\n?/, '').replace(/```$/, '');
    const result = JSON.parse(sanitizedJsonText) as BarrelData;

    // Basic validation
    if (!Array.isArray(result) || result.some(item => typeof item !== 'object' || item === null)) {
        throw new Error("AI response is not a valid array of objects.");
    }

    return result;
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to analyze image: ${error.message}`);
    }
    throw new Error("An unknown error occurred during image analysis.");
  }
};


export const verifyTableData = async (imageFile: File, extractedData: BarrelData): Promise<BarrelData> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = await fileToGenerativePart(imageFile);
  const dataString = JSON.stringify(extractedData, null, 2);

  const prompt = `
    You are an extremely precise and methodical data verification AI. Your task is to audit a JSON dataset that was extracted from the provided image of barrel volume tables. You must find and correct any inaccuracies in the JSON data by comparing it meticulously against the image.

    **Input:**
    1.  An image containing tables of barrel volume data.
    2.  A JSON array of objects representing the data. Each cell is an object with a "value" and a "confidence".

    **Instructions:**

    1.  **Goal:** Your final output MUST be the corrected version of the input JSON array. The structure, keys, and format must be identical, only the cell objects' "value" and "confidence" should be changed based on your verification.

    2.  **Methodical Verification Process:**
        - Iterate through each object in the JSON array (each corresponds to a "Mouillé" row).
        - For each row, go through every key-value pair (e.g., "390L_Diam80": { "value": 221, "confidence": "medium" }).
        - Find the exact cell in the image corresponding to the "Mouillé" value and the specific table/column key.
        - **Compare & Correct:** Compare the \`value\` from the JSON with the value in the image. Correct it if it's wrong.
        - **Assign Confidence:** After verifying the value, update the \`confidence\` field:
            - \`'high'\`: The number in the image is perfectly clear and you are 100% certain of the value.
            - \`'medium'\`: The number is slightly blurry, smudged, or ambiguous (e.g., a 3 could be a 5).
            - \`'low'\`: The number is very hard to read, partially cut off, or illegible.
        - **Handle Missing Data:** If a cell in the image is empty, has a dot (.), or a dash (-), the \`value\` in the JSON MUST be \`null\` and the \`confidence\` should be \`'high'\`.

    3.  **CRITICAL LOGIC RULE - No Numbers After Nulls:**
        - Within a single "Mouillé" row, for any given barrel capacity (e.g., all "390L_..." columns), once you encounter a \`null\` value, all subsequent columns for that SAME capacity MUST also have \`null\` values.
        - **Example of an Error to Fix:** If you see \`"390L_Diam82": { "value": null, ... }, "390L_Diam84": { "value": 388, ... }\`, this is a logical contradiction. It means an OCR error likely occurred for "390L_Diam82". You MUST re-examine the image, find the correct value for the "390L_Diam82" cell, and correct the entire sequence for that barrel capacity in that row. The data must be contiguous.

    4.  **Final Output Format:**
        - The response MUST be only the raw, corrected JSON array.
        - Do not include any extra text, explanations, apologies, or markdown code block formatting. Just the JSON.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: {
          parts: [
            { text: prompt },
            imagePart,
            { text: `Here is the JSON data to verify:\n\n${dataString}` }
          ]
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 32768 },
      },
    });

    const jsonText = response.text.trim();
    const sanitizedJsonText = jsonText.replace(/^```json\n?/, '').replace(/```$/, '');
    const result = JSON.parse(sanitizedJsonText) as BarrelData;

    if (!Array.isArray(result) || result.some(item => typeof item !== 'object' || item === null)) {
        throw new Error("AI verification response is not a valid array of objects.");
    }

    return result;
  } catch (error) {
    console.error("Error verifying data with Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to verify data: ${error.message}`);
    }
    throw new Error("An unknown error occurred during AI data verification.");
  }
};
