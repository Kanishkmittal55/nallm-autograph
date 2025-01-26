import Tesseract, { PSM , Worker, Block, createWorker} from "tesseract.js";
import * as pdfjs from "pdfjs-dist";


export async function createOCRWorker() {
    const worker = await createWorker("eng", 1,{
        logger: (info) => console.log(info), // Logs OCR progress
      });
    // Set additional worker parameters
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO, // Set page segmentation mode to automatic
    });
  
    return worker; // Return the initialized worker
}

// async function setupWorker() {
//   const worker = await Tesseract.createWorker("eng", 1, {
//     logger: (info) => console.log(info), // Logs OCR progress
//     langPath: "https://tessdata.projectnaptha.com/4.0.0", // Path for language data
//     workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@2.1.1/dist/worker.min.js", // Worker script path
//     corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@2.1.1/tesseract-core.wasm.js", // Core WASM path
//     gzip: true, // Use gzipped trained data
//   });

//   await worker.load();
//   await worker.setParameters({
//     tessedit_pageseg_mode: PSM.AUTO,
//   });

//   return worker;
// }

// This will take a worker instance and the image and console log the text.
export async function recognizeImage(worker: Worker, image: string | File | Blob): Promise<void> {
    try {
      console.log("Processing image...");
      const { data: { text },} = await worker.recognize(image); // Perform OCR on the image
      console.log("Recognized Text:", text);
    } catch (error) {
      console.error("Error during OCR:", error);
    }
}

export async function convertPdfPageToImage(pdfFile: string, pageNumber: number, scale: number = 2): Promise<{ image: string; viewport: pdfjs.PageViewport }> {
    try {
      // Load the PDF file
      const loadingTask = pdfjs.getDocument(pdfFile);
      const pdf = await loadingTask.promise;
  
      // Get the specified page
      const page = await pdf.getPage(pageNumber);
  
      // Get the viewport for the PDF page
      const viewport = page.getViewport({ scale });
  
      // Render the page to a canvas
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
  
      if (!context) {
        throw new Error("Failed to get canvas 2D context");
      }
  
      canvas.width = viewport.width;
      canvas.height = viewport.height;
  
      const renderContext = {
        canvasContext: context,
        viewport,
      };
      await page.render(renderContext).promise;
  
      // Convert the canvas to a data URL (image)
      const image = canvas.toDataURL("image/png");
  
      return { image, viewport };
    } catch (error) {
      console.error("Error during PDF to image conversion:", error);
      throw error;
    }
  }
  

// export async function convertPdfPageToImage( pdfFile: string, pageNumber: number, scale: number = 2) : Promise<string> {
//     try {
//         // Load the PDF file using pdf.js
//         const loadingTask = pdfjs.getDocument(pdfFile);
//         const pdf = await loadingTask.promise;
    
//         // Get the specified page
//         const page = await pdf.getPage(pageNumber);
    
//         // Render the page to a canvas
//         const viewport = page.getViewport({ scale });
//         const canvas = document.createElement("canvas");
//         const context = canvas.getContext("2d");
    
//         if (!context) {
//           throw new Error("Failed to get canvas 2D context");
//         }
    
//         canvas.width = viewport.width;
//         canvas.height = viewport.height;
    
//         const renderContext = {
//           canvasContext: context,
//           viewport,
//         };
//         await page.render(renderContext).promise;
    
//         // Convert the canvas to a data URL (image)
//         return canvas.toDataURL("image/png");
//       } catch (error) {
//         console.error("Error during PDF to image conversion:", error);
//         throw error; // Rethrow the error for the calling function to handle
//       }
//     }

export async function performOCR(
    worker: Worker,
    pdfFile: string,
    pageNumber: number
  ): Promise<string> {
    try {
      // Convert the PDF Page to an image using the helper function above
      const { image }  = await convertPdfPageToImage(pdfFile, pageNumber)

      // Perform OCR using the worker
      console.log(`Performing OCR on page ${pageNumber}...`);
      const {
        data: { text },
      } = await worker.recognize(image);
  
      // Transform OCR results into bounding boxes
    //   const boundingBoxes = text.map((word: any) => ({
    //     text: word.text,
    //     x: word.bbox.x0,
    //     y: word.bbox.y0,
    //     width: word.bbox.x1 - word.bbox.x0,
    //     height: word.bbox.y1 - word.bbox.y0,
    //   }));
  
    //   return boundingBoxes;
    // Log the recognized text
    console.log("Recognized Text:", text);

    // Return the recognized text
      return text;
    } catch (error) {
      console.error("Error during OCR processing:", error);
      return "";
    }
  }

  const adjustCanvasSizeForPaper = (canvas: HTMLCanvasElement, viewport: pdfjs.PageViewport, paperSize: string) => {
    const { width, height } = viewport;
  
    if (paperSize === "A4") {
      canvas.width = 595; // A4 width in points
      canvas.height = (595 / width) * height; // Scale height proportionally
    } else if (paperSize === "A3") {
      canvas.width = 841; // A3 width in points
      canvas.height = (841 / width) * height; // Scale height proportionally
    } else if (paperSize === "Letter") {
      canvas.width = 612; // Letter width in points
      canvas.height = (612 / width) * height; // Scale height proportionally
    } else {
      // Default: Use viewport dimensions
      canvas.width = width;
      canvas.height = height;
    }
  };
  

  function scaleBoundingBoxes(
    boxes: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>,
    canvasWidth: number,
    canvasHeight: number,
    viewportWidth: number,
    viewportHeight: number
  ) {
    const xScale = canvasWidth / viewportWidth;
    const yScale = canvasHeight / viewportHeight;
  
    return boxes.map(({ text, bbox }) => ({
      text,
      bbox: {
        x0: bbox.x0 * xScale,
        y0: bbox.y0 * yScale,
        x1: bbox.x1 * xScale,
        y1: bbox.y1 * yScale,
      },
    }));
  }

  function refineBoundingBox(
    bbox: { x0: number; y0: number; x1: number; y1: number },
    shrinkFactor: number
  ) {
    const width = bbox.x1 - bbox.x0;
    const height = bbox.y1 - bbox.y0;
  
    return {
      x0: bbox.x0 + width * shrinkFactor,
      y0: bbox.y0 + height * shrinkFactor,
      x1: bbox.x1 - width * shrinkFactor,
      y1: bbox.y1 - height * shrinkFactor,
    };
  }
  
export async function performOCRAndDrawBoundingBoxes(worker: Worker, pdfFile: string, pageNumber: number , canvasId: string, paperSize: string) {
   // Convert the PDF Page to an image using the helper function
   try {
    // Convert the PDF page to an image using the helper function
    const {  image, viewport } = await convertPdfPageToImage(pdfFile, pageNumber);

    // Resize the canvas based on the PDF dimensions
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with ID "${canvasId}" not found.`);
    }

    adjustCanvasSizeForPaper(canvas, viewport, paperSize); // Pass the `selectedPaperSize` from state
    
    // Perform OCR with bounding box output enabled
    const { data } = await worker.recognize(image, {}, { box: true });
    console.log("Full OCR Data:", data);

    // Extract bounding box data
    const { box } = data;

    if (!box) {
    console.warn("No bounding boxes detected.");
    return;
    }

    // Convert `box` into an iterable array (if it’s not already one)
    let boundingBoxes: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }> = [];

        if (typeof box === "string") {
            console.log("The type of box is :" , typeof box)
            // If `box` is a string, parse it (example for HOCR format)
            const lines = box.split("\n");
            boundingBoxes = lines.map((line) => {
                const [text, x0, y0, x1, y1] = line.split(" ");
                return {
                text: text || "",
                bbox: {
                    x0: parseFloat(x0),
                    y0: parseFloat(y0),
                    x1: parseFloat(x1),
                    y1: parseFloat(y1),
                },
                };
        });
        } else if (typeof box === "object") {
            // If `box` is an object, transform it into an array
            boundingBoxes = Object.entries(box).map(([key, value]: [string, any]) => ({
                text: key,
                bbox: {
                x0: parseFloat(value.x0),
                y0: parseFloat(value.y0),
                x1: parseFloat(value.x1),
                y1: parseFloat(value.y1),
                },
        }));
        } else {
            console.warn("Unsupported box format:", box);
        return;
        }

    // // Scale bounding boxes to fit the canvas
    // boundingBoxes = scaleBoundingBoxes(
    //     boundingBoxes,
    //     canvas.width,
    //     canvas.height,
    //     viewport.width,
    //     viewport.height
    //   );

    // boundingBoxes = boundingBoxes.map(({ text, bbox }) => ({
    // text,
    // bbox: refineBoundingBox(bbox, 0.1), // Shrink by 10%
    // }));

    // Now `boundingBoxes` is iterable and in the correct format
    console.log("Parsed bounding boxes:", boundingBoxes);

    // Draw bounding boxes on the canvas
    drawBoundingBoxes(canvasId, boundingBoxes);

   
  } catch (error) {
    console.error("Error during OCR processing:", error);
  }

  }

  function drawBoundingBoxes(
    canvasId: string,
    boxes: { text: string | number; bbox: { x0: string | number; y0: string | number; x1: string | number; y1: string | number } }[]
  ): void {
    // Get the canvas and its 2D rendering context
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) {
      throw new Error(`Canvas with ID "${canvasId}" not found.`);
    }
  
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get 2D context for canvas.");
    }
  
    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

     // Flip the canvas vertically
    context.translate(0, canvas.height); // Move the origin to the bottom-left
    context.scale(1, -1); // Flip the Y-axis
  
    // Set bounding box style
    context.strokeStyle = "red"; // Red border for bounding boxes
    context.lineWidth = 2;
  
    // Loop through each bounding box and draw it
    boxes.forEach(({ text, bbox }) => {
      const x0 = typeof bbox.x0 === "string" ? parseFloat(bbox.x0) : bbox.x0;
      const y0 = typeof bbox.y0 === "string" ? parseFloat(bbox.y0) : bbox.y0;
      const x1 = typeof bbox.x1 === "string" ? parseFloat(bbox.x1) : bbox.x1;
      const y1 = typeof bbox.y1 === "string" ? parseFloat(bbox.y1) : bbox.y1;
  
      const width = x1 - x0;
      const height = y1 - y0;
  
      // Draw rectangle
      context.strokeRect(x0, y0, width, height);

    });
  }
  