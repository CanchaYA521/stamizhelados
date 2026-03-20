import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nutria Systems",
    short_name: "Nutria",
    description:
      "Sistema mobile-first para ventas, caja diaria y reportes de una heladería.",
    start_url: "/app/venta",
    display: "standalone",
    background_color: "#f6efe4",
    theme_color: "#d5632a",
    lang: "es-PE",
    orientation: "portrait",
    icons: [
      {
        src: "/logoo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
