import toast from "react-hot-toast";
import { axiosInstance } from "../services/apiService";

export const printGresFillingPng = async (gresId, formType, setLoadingKey) => {
  const key = String(formType || "").toLowerCase();
  setLoadingKey?.(key);

  try {
    const res = await axiosInstance.get(
      `/api/v1/gres-fillings/${gresId}/type/${formType}/png`,
      {
        responseType: "blob",
        headers: { Accept: "image/png,application/json" },
      }
    );

    const blob = new Blob([res.data], { type: "image/png" });
    const blobUrl = URL.createObjectURL(blob);
    const filename = `gres-filling-${gresId}-javak.png`;

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <title>Print - ${filename}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; justify-content: center; align-items: flex-start; }
    img { max-width: 100%; height: auto; display: block; }
    @media print { body { margin: 0; } img { width: 100%; } }
  </style>
</head>
<body>
  <img src="${blobUrl}"
    onload="window.focus(); window.print();"
    onerror="window.parent.postMessage('print-error','*');" />
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 120000);

    toast.success("JAVAK image downloaded. Print dialog will open shortly.");
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || "Failed to generate print";
    toast.error(msg);
  } finally {
    setLoadingKey?.(null);
  }
};
