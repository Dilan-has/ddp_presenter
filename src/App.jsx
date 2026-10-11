import LiveOutput from "./components/LiveOutput";
import StageOutput from "./components/StageOutput";
import OperatorPanel from "./components/OperatorPanel/OperatorPanel";
import RemoteControl from "./components/RemoteControl/RemoteControl";

function App() {
  const path = window.location.pathname;

  if (path === "/output/live" || path === "/live") {
    return <LiveOutput />;
  }

  if (path === "/output/stage" || path === "/stage") {
    return <StageOutput />;
  }

  if (path === "/remote" || path === "/control") {
    return <RemoteControl />;
  }

  return <OperatorPanel />;
}

export default App;
