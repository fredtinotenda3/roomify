// FILE: C:\Users\user\Desktop\roomify\lib\types.ts

import type { PresetCategory } from './presets';

export interface AuthState {
    isSignedIn: boolean;
    userName: string | null;
    userId: string | null;
}

export interface Material {
    id: string;
    name: string;
    thumbnail: string;
    type: "color" | "texture";
    category: "floor" | "wall" | "furniture";
}

export type DesignStyle = 'modern' | 'rustic' | 'industrial' | 'scandinavian' | 'bohemian';

export interface DesignItem {
    id: string;
    name?: string | null;
    sourceImage: string;
    sourcePath?: string | null;
    renderedImage?: string | null;
    renderedPath?: string | null;
    publicPath?: string | null;
    timestamp: number;
    ownerId?: string | null;
    sharedBy?: string | null;
    sharedAt?: string | null;
    isPublic?: boolean;
    shareToken?: string | null;
    style?: DesignStyle;
    preset?: PresetCategory;
    renderedStyles?: Record<DesignStyle, string>;
    renderedPresets?: Record<string, string>;
    viewCount?: number;
    likeCount?: number;
}

export interface DesignConfig {
    floor: string;
    walls: string;
    style: string;
}

export enum AppStatus {
    IDLE = "IDLE",
    UPLOADING = "UPLOADING",
    PROCESSING = "PROCESSING",
    READY = "READY",
}

export type RenderCompletePayload = {
    renderedImage: string;
    renderedPath?: string;
    style?: DesignStyle;
    preset?: PresetCategory;
};

export type VisualizerLocationState = {
    initialImage?: string;
    initialRender?: string | null;
    ownerId?: string | null;
    name?: string | null;
    sharedBy?: string | null;
    isPublicView?: boolean;
};

export interface VisualizerProps {
    onBack: () => void;
    initialImage: string | null;
    onRenderComplete?: (payload: RenderCompletePayload) => void;
    onShare?: (image: string) => Promise<void> | void;
    onUnshare?: (image: string) => Promise<void> | void;
    projectName?: string;
    projectId?: string;
    initialRender?: string | null;
    isPublic?: boolean;
    sharedBy?: string | null;
    canUnshare?: boolean;
    isPublicView?: boolean;
}

export interface UploadProps {
    onComplete: (base64File: string) => Promise<boolean | void> | boolean | void;
    className?: string;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
    fullWidth?: boolean;
}

export interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    action?: React.ReactNode;
}

export type AuthContext = {
    isSignedIn: boolean;
    userName: string | null;
    userId: string | null;
    refreshAuth: () => Promise<boolean>;
    signIn: () => Promise<boolean>;
    signOut: () => Promise<boolean>;
};

export type AuthRequiredModalProps = {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
};

export type ShareAction = "share" | "unshare";
export type ShareStatus = "idle" | "saving" | "done";

export type HostingConfig = { subdomain: string };
export type HostedAsset = { url: string };

export interface StoreHostedImageParams {
    hosting: HostingConfig | null;
    url: string;
    projectId: string;
    label: "source" | "rendered";
}

export interface CreateProjectParams {
    item: DesignItem;
    visibility?: "private" | "public";
}

export interface Generate3DViewParams {
    sourceImage: string;
    projectId?: string | null;
    style?: DesignStyle;
    preset?: PresetCategory;
}

// Public Gallery Types
export interface PublicProject extends DesignItem {
    ownerName?: string;
    isLiked?: boolean;
}

export interface GalleryFilter {
    sortBy: 'recent' | 'popular' | 'mostLiked';
    style?: DesignStyle;
    preset?: PresetCategory;
    search?: string;
}