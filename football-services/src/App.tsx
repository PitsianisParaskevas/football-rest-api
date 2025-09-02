import { useState } from "react";
import GetGeneralData from "./pages/GetGeneralData";
import GetMatchDayData from "./pages/GetMatchDayData";
import ImportRound from "./pages/ImportRound";

import "./App.css";
import ImportImages from "./pages/DownloadImages";

function App() {
  const [activeSection, setActiveSection] = useState("general");

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return <GetGeneralData />;
      case "matchday":
        return <GetMatchDayData />;
      case "round":
        return <ImportRound />;
      case "image":
        return <ImportImages />;
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
          onClick={() => setActiveSection("matchday")}
          className={activeSection === "matchday" ? "active-button" : ""}
        >
          Get Match Day Data
        </button>

        <button
          onClick={() => setActiveSection("round")}
          className={activeSection === "round" ? "active-button" : ""}
        >
          Import Round{" "}
        </button>

        <button
          onClick={() => setActiveSection("image")}
          className={activeSection === "iamge" ? "active-button" : ""}
        >
          Get Image
        </button>
      </div>

      <div className="section-content">{renderSection()}</div>
    </div>
  );
}

export default App;
