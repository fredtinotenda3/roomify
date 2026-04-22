// FILE: C:\Users\user\Desktop\roomify\app\routes.ts

import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("visualizer/:id", "routes/visualizer.$id.tsx"),
    route("gallery", "routes/gallery.tsx"),
] satisfies RouteConfig;