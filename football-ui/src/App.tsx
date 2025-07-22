import { useState } from "react";
import GetGeneralData from "./pages/GetGeneralData";
import ImportGeneralData from "./pages/ImportGeneralData";
import GetMatchDayData from "./pages/GetMatchDayData";
import "./App.css";

function App() {
  const [activeSection, setActiveSection] = useState("general");

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return <GetGeneralData />;
      case "import":
        return <ImportGeneralData />;
      case "matchday":
        return <GetMatchDayData />;
      default:
        return null;
    }
  };

  return (
    <div className="App">
      <h1>Football Data Tool</h1>

      <div className="section-switcher">
        <button
          onClick={() => setActiveSection("general")}
          className={activeSection === "general" ? "active-button" : ""}
        >
          Get General Data
        </button>
        <button
          onClick={() => setActiveSection("import")}
          className={activeSection === "import" ? "active-button" : ""}
        >
          Import General Data
        </button>
        <button
          onClick={() => setActiveSection("matchday")}
          className={activeSection === "matchday" ? "active-button" : ""}
        >
          Get Match Day Data
        </button>
      </div>

      <div className="section-content">{renderSection()}</div>
    </div>
  );
}

export default App;
