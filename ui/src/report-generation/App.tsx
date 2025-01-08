import "@neo4j-ndl/base/lib/neo4j-ds-styles.css";
import { useState, useEffect, ChangeEvent } from "react";
import { Pie } from "react-chartjs-2"
import KeyModal from "../components/keymodal";
import { get_patent_data, CosmeticProduct } from "./utils/fetch-example-companies"
import Chart from "chart.js/auto";
import { ArcElement, Tooltip, Legend } from "chart.js";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

// Register required components
Chart.register(ArcElement, Tooltip, Legend);

const HAS_API_KEY_URI =
  import.meta.env.VITE_HAS_API_KEY_ENDPOINT ??
  "http://localhost:7860/hasapikey";

function loadKeyFromStorage() {
  return localStorage.getItem("api_key");
}

const dummyPatents = [
  { id: 1, name: "Patent 1", description: "Patent Analysis 1" },
  { id: 2, name: "Patent 2", description: "Patent Analysis 2" },
  { id: 3, name: "Patent 3", description: "Patent Analysis 3" },
];


function App() {
  const [serverAvailable, setServerAvailable] = useState(true);
  const [needsApiKeyLoading, setNeedsApiKeyLoading] = useState(true);
  const [needsApiKey, setNeedsApiKey] = useState(true);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(loadKeyFromStorage() || "");
  const [patentData, setPatentData] = useState<CosmeticProduct | null>(null);
  const [loadingPatentData, setLoadingPatentData] = useState(false);
  const [typedPatentName, setTypedPatentName] = useState("");

  const [currentPatentIndex, setCurrentPatentIndex] = useState(0);
  const [selectedPatent, setSelectedPatent] = useState<number | null>(null);


  const initDone = serverAvailable && !needsApiKeyLoading;

  useEffect(() => {
    fetch(HAS_API_KEY_URI).then(
      (response) => {
        response.json().then(
          (result) => {
            // const needsKey = result.output;
            const needsKey = !result.output;
            setNeedsApiKey(needsKey);
            setNeedsApiKeyLoading(false);
            if (needsKey) {
              const api_key = loadKeyFromStorage();
              if (api_key) {
                setApiKey(api_key);
              } else {
                setModalIsOpen(true);
              }
            }
          },
          (error) => {
            setNeedsApiKeyLoading(false);
            setServerAvailable(false);
          }
        );
      },
      (error) => {
        setNeedsApiKeyLoading(false);
        setServerAvailable(false);
      }
    );
  }, []);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const onCloseModal = () => {
    setModalIsOpen(false);
  };

  const onApiKeyChange = (newApiKey: string) => {
    setApiKey(newApiKey);
    localStorage.setItem("api_key", newApiKey);
  };

  const handleNextPatent = () => {
    setCurrentPatentIndex((prev) =>
      Math.min(prev + 1, dummyPatents.length - 1)
    );
  };
  
  const handlePreviousPatent = () => {
    setCurrentPatentIndex((prev) => Math.max(prev - 1, 0));
  };
  
  const handlePatentSelect = (id: number) => {
    setSelectedPatent(id);
    fetchAndDisplayPatentData(); // Fetch patent data when selected
  };
  

  const fetchAndDisplayPatentData = () => {
    setLoadingPatentData(true);
    const key = apiKey === "" ? undefined : apiKey;
    const data = get_patent_data();
    setLoadingPatentData(false);

    if (data) {
      setPatentData(data);
      console.log(data)
    } else {
      console.log("No data found for the specified patent.");
    }
  };

  const calculateCompositionData = (data: CosmeticProduct) => {
    const functionalRoles = data.properties.functional_roles;
  
    // Extract the total weight percentages for each functional role
    const labels = functionalRoles.map((role) => role.role);
    const values = functionalRoles.map((role) => {
      const range = role.total_weight
        .replace("% by weight", "") // Remove unit
        .split("-")
        .map((val) => parseFloat(val.trim())); // Parse as numbers
  
      return (range[0] + range[1]) / 2; // Calculate the average of the range
    });
  
    return {
      labels,
      datasets: [
        {
          label: "Composition Analysis",
          data: values,
          backgroundColor: [
            "#FF6384", // Pink
            "#36A2EB", // Blue
            "#FFCE56", // Yellow
            "#4BC0C0", // Teal
            "#9966FF", // Purple
          ],
        },
      ],
    };
  };
  
  
  // Example usage
  const compositionChartData =
  patentData ? calculateCompositionData(patentData) : null;
  if (compositionChartData) {
    console.log(compositionChartData);
  }

  
  return (
    <div className="flex h-screen">
    <PanelGroup direction="horizontal"> 
      {/* Left Main Section divided into two controllers */}
      <Panel defaultSize={50} minSize={20} maxSize={80}>
        {/* Left Panel */}
        <div className="h-full flex flex-col bg-gray-100 border-r">
          {/* Top Resizable Section */}
          <PanelGroup direction="vertical">

            {/* Top Resizable Panel */}
            <Panel defaultSize={50} minSize={20} maxSize={80}>

              {/* Patent Analysis Console */}
              <div className="h-full flex items-center justify-center relative">
                
                {/* Previous Button */}
                <button
                  className="absolute left-2 bg-blue-500 text-white px-2 py-1 rounded"
                  onClick={handlePreviousPatent}
                >
                  ←
                </button>

                {/* Centered Patent */}
                <div
                  className="p-4 bg-white shadow-md cursor-pointer rounded text-center"
                  onClick={() =>
                    handlePatentSelect(dummyPatents[currentPatentIndex].id)
                  }
                >
                  {dummyPatents[currentPatentIndex].name}
                </div>

                {/* Next Button */}
                <button
                  className="absolute right-2 bg-blue-500 text-white px-2 py-1 rounded"
                  onClick={handleNextPatent}
                >
                  →
                </button>
              </div>
            </Panel>

          {/* Resizable Handle */}
          <PanelResizeHandle className="h-[5px] bg-gray-400" />

          {/* Bottom Resizable Panel */}
          <Panel defaultSize={50} minSize={20} maxSize={80}>
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h3>Chemical Analysis Console</h3>
                {/* Placeholder Content */}
                <p>(Editable content for you)</p>
              </div>
            </div>
          </Panel>
        </PanelGroup>

        </div>
      </Panel>

      {/* Resizable Handle */}
      <PanelResizeHandle className="w-2 bg-gray-400 cursor-col-resize" />

      {/* Right Main Section divided into two Views */}
      <Panel defaultSize={50} minSize={20} maxSize={80}>
          {/* Right Panel */}
          <div className="h-full bg-white">
            <PanelGroup direction="horizontal">
              {/* Left Internal Panel */}
              <Panel defaultSize={50} minSize={20} maxSize={80}>
                <div className="h-full p-4 bg-white flex flex-col">
                  {selectedPatent !== null && patentData && !loadingPatentData ? (
                    <>
                      {/* Chart Section - 40% Height */}
                      <div className="h-[40%] flex items-center justify-center">
                        <Pie
                          data={calculateCompositionData(patentData)}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false, // Allow manual height control
                            plugins: {
                              legend: { display: true, position: "bottom" },
                              title: {
                                display: true,
                                text: "Functional Role Composition",
                                font: { size: 16 },
                              },
                            },
                          }}
                        />
                      </div>

                      {/* Empty Section - 60% Height */}
                      <div className="h-[60%] border-t mt-4 flex items-center justify-center">
                        <p className="text-gray-400 text-center">[Empty Space for Future Content]</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-center">
                      Select a patent to see the analysis.
                    </p>
                  )}
                </div>
              </Panel>

              {/* Resizable Handle */}
              <PanelResizeHandle className="w-[5px] bg-gray-400" />

              {/* Right Internal Panel */}
              <Panel defaultSize={50} minSize={20} maxSize={80}>
                <div className="h-full p-4 bg-white flex flex-col">
                  {selectedPatent !== null && patentData && !loadingPatentData ? (
                    <>
                      {/* Chart Section - 40% Height */}
                      <div className="h-[40%] flex items-center justify-center">
                        <Pie
                          data={calculateCompositionData(patentData)}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false, // Allow manual height control
                            plugins: {
                              legend: { display: true, position: "bottom" },
                              title: {
                                display: true,
                                text: "Functional Role Composition",
                                font: { size: 16 },
                              },
                            },
                          }}
                        />
                      </div>

                      {/* Empty Section - 60% Height */}
                      <div className="h-[60%] border-t mt-4 flex items-center justify-center">
                        <p className="text-gray-400 text-center">[Empty Space for Future Content]</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-center">
                      Select a patent to see the analysis.
                    </p>
                  )}
                </div>
                </Panel>
              </PanelGroup>
            </div>
      </Panel>

  </PanelGroup>

</div>

  );
  
  
}

export default App;
