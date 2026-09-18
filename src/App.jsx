import LiveOutput from "./components/LiveOutput";
import StageOutput from "./components/StageOutput";
import OperatorPanel from "./components/OperatorPanel/OperatorPanel";

function App() {
  const path = window.location.pathname;

  if (path === "/output/live") {
    return <LiveOutput />;
  }

  if (path === "/output/stage") {
    return <StageOutput />;
  }

  return <OperatorPanel />;
}

export default App;
