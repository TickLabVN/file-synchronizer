import { useEffect, useState } from "react";
import Loading from "./components/Loading";
import Dashboard from "./components/Dashboard";
import TitleBar from "./components/TitleBar";
import { toast, ToastContainer, type Id } from "react-toastify";
import * as api from "./api";

const App: React.FC = () => {
  const [auth, setAuth] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [provider, setProvider] = useState<{
    type: string;
    accountId: string;
  } | null>(null);

  useEffect(() => {
    async function init(): Promise<void> {
      try {
        const gd = (await api.listAccounts()) as {
          id: string;
          displayName?: string;
        }[];
        if (gd.length) {
          const { id, displayName } = gd[0];
          await api.useAccount(id);
          setProvider({ type: "google", accountId: id });
          setUsername(displayName || id.split("@")[0]);
          setAuth(true);
        } else {
          const bx = (await api.listBoxAccounts()) as {
            id: string;
            displayName?: string;
          }[];
          if (bx.length) {
            const { id, displayName } = bx[0];
            await api.useBoxAccount(id);
            setProvider({ type: "box", accountId: id });
            setUsername(displayName || id);
            setAuth(true);
          }
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
    //@ts-ignore: window.electron is defined in preload script
    if (!window?.electron?.ipcRenderer) return;
    const onToast = (_: unknown, msg: unknown): Id => toast.info(String(msg), { toastId: String(msg) });
    //@ts-ignore: window.electron is defined in preload script
    window.electron.ipcRenderer.on("app:toast", onToast);
    return () =>
      //@ts-ignore: window.electron is defined in preload script
      window.electron.ipcRenderer.removeListener("app:toast", onToast);
  }, []);

  useEffect(() => {
    //@ts-ignore: window.electron is defined in preload script
    if (!window?.electron?.ipcRenderer) return;
    const handler = (_: unknown, data: { type: string; accountId: string } | null): void => {
      setProvider(data); // {type, accountId} | null
      if (!data) return setUsername("");

      if (data.type === "google") {
        //@ts-ignore: window.electron is defined in preload script
        api.getProfile(data.accountId).then((p) =>
          //@ts-ignore: window.electron is defined in preload script
          setUsername(p?.name || data.accountId)
        );
      } else {
        //@ts-ignore: window.electron is defined in preload script
        api.getBoxProfile(data.accountId).then((p: { name?: string }) => setUsername(p?.name || data.accountId));
      }
    };
    //@ts-ignore: window.electron is defined in preload script
    window.electron.ipcRenderer.on("ui:set-active-provider", handler);
    return () =>
      //@ts-ignore: window.electron is defined in preload script
      window.electron.ipcRenderer.removeListener("ui:set-active-provider", handler);
  }, []);

  return (
    <>
      <ToastContainer position="bottom-left" autoClose={5000} pauseOnFocusLoss={false} />
      <div className="flex h-screen flex-col overflow-hidden">
        <div className="z-10">
          <TitleBar />
        </div>
        <div className="flex-1 overflow-auto">
          {loading || updating ? (
            <Loading updating={updating} />
          ) : (
            <Dashboard auth={auth} provider={provider} username={username} />
          )}
        </div>
      </div>
    </>
  );
};

export default App;
