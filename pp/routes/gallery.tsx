// FILE: C:\Users\user\Desktop\roomify\app\routes\gallery.tsx

import Navbar from "../../components/Navbar";
import PublicGallery from "../../components/PublicGallery";

export function meta() {
  return [
    { title: "Community Gallery - Roomify" },
    { name: "description", content: "Explore stunning architectural designs created by the Roomify community" },
  ];
}

export default function Gallery() {
    return (
        <div className="gallery-page" style={{ minHeight: '100vh', background: '#fdfbf7' }}>
            <Navbar />
            <PublicGallery />
        </div>
    );
}