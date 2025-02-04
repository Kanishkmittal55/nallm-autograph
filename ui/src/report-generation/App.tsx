import React, { useState, useEffect } from "react";
import PipelineView from "./PipelineView";
import GraphView from "./GraphView";

// Example data type for each chunk
interface ChunkData {
  text: string;
  isLabel: boolean;
}

const GraphCreatorApp: React.FC = () => {
  // These states can be shared by PipelineView and GraphView if needed
  const [chunks, setChunks] = useState<ChunkData[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);

  // Prompt, context, and LLM responses
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [globalContext, setGlobalContext] = useState("");
  const [responses, setResponses] = useState<string[]>([]);

  // Triplets (extracted from user’s prompts or chunk analysis)
  const [triplets, setTriplets] = useState<
    Array<{ id: string; subject: string; predicate: string; object: string }>
  >([]);

  // On mount, load any exported chunks from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("EXPORTED_CHUNKS");
    if (raw) {
      try {
        const arr = JSON.parse(raw) as ChunkData[];
        setChunks(arr);
        setResponses(Array(arr.length).fill("")); // initialize empty responses
      } catch (e) {
        console.error("Failed to parse EXPORTED_CHUNKS from localStorage.", e);
      }
    }
  }, []);

  return (
    <div className="flex flex-col w-full h-full overflow-auto">
      {/* 
        1) PipelineView at the top
        2) Scroll down => GraphView below 
      */}

      {/* Pipeline View */}
      <PipelineView
        chunks={chunks}
        currentChunkIndex={currentChunkIndex}
        setCurrentChunkIndex={setCurrentChunkIndex}
        currentPrompt={currentPrompt}
        setCurrentPrompt={setCurrentPrompt}
        globalContext={globalContext}
        setGlobalContext={setGlobalContext}
        responses={responses}
        setResponses={setResponses}
        triplets={triplets}
        setTriplets={setTriplets}
      />

      {/* Graph View */}
      <GraphView
        triplets={triplets}
        // If you need to pass down any other data or handlers, do so here
      />
    </div>
  );
};

export default GraphCreatorApp;
