import { QRCodeSVG } from "qrcode.react";

function QRCodeGenerator({ tableNumber }) {
  const url = `${window.location.origin}/menu?table=${tableNumber}`;

  return (
    <div>
      <h2>Table {tableNumber}</h2>

      <QRCodeSVG
        value={url}
        size={250}
      />

      <p>{url}</p>
    </div>
  );
}

export default QRCodeGenerator;