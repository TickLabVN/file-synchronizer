import { useEffect, useState } from "react";
import Loading from "./components/Loading";
import Dashboard from "./components/Dashboard";
import TitleBar from "./components/TitleBar";
import { toast, ToastContainer, type Id } from "react-toastify";
import * as api from "./api";

const App: React.FC = () => {
  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function init(): Promise<void> {
      try {
        // Check if user is authenticated
        const accounts = (await api.listAccounts("google")) || (await api.listAccounts("box"));
        if (accounts.length > 0) {
          setAuth(true);
        } else {
          setAuth(false);
        }
      } catch (err) {
        console.error("Init error:", err);
        toast.error("Failed to initialize application");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (api.onUpdateAvailable) {
      api.onUpdateAvailable((info: { version: string; releaseNotes?: string }) => {
        console.log("Update available:", info);
        setUpdating(true);
      });
    } else {
      console.warn("onUpdateAvailable is not defined in API");
    }
    if (api.onUpdateDownloaded) {
      api.onUpdateDownloaded((info: { version: string; releaseNotes?: string }) => {
        console.log("Update downloaded:", info);
        setUpdating(false);
      });
    } else {
      console.warn("onUpdateDownloaded is not defined in API");
    }
  }, []);

  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;
    const onToast = (_: unknown, msg: unknown): Id => toast.info(String(msg), { toastId: String(msg) });
    window.electron.ipcRenderer.on("app:toast", onToast);
    return () => window.electron?.ipcRenderer?.removeListener("app:toast", onToast);
  }, []);

  return (
    <>
      <ToastContainer position="bottom-left" autoClose={5000} pauseOnFocusLoss={false} />
      <div className="flex h-screen flex-col overflow-hidden">
        <div className="z-10">
          <TitleBar />
        </div>
        <div className="flex-1 overflow-auto">
          {loading || updating ? <Loading updating={updating} /> : <Dashboard auth={auth} />}
        </div>
      </div>
    </>
  );
};

export default App;
