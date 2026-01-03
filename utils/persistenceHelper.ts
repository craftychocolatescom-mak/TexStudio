
import { supabase } from '../services/supabaseClient';

// Helper to compress base64 images using Canvas
const compressImage = (base64Str: string, maxWidth = 1200, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context unavailable'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Compression failed'));
            }, 'image/jpeg', quality); // Convert to JPEG for better compression
        };
        img.onerror = (err) => reject(err);
    });
};

export const saveArtifactToSupabase = async (
    userId: string,
    projectId: string,
    type: 'visualizer' | 'pattern' | 'cutting' | 'costing' | 'social',
    title: string,
    data: any,
    imageUrl?: string // Optional base64 or url
) => {
    const label = `SaveArtifact-${type}-${Date.now()}`;
    console.time(label);

    try {
        let finalImageUrl = '';

        // 1. Upload Image if provided and is base64
        if (imageUrl && imageUrl.startsWith('data:')) {
            try {
                // Compress before upload
                const blob = await compressImage(imageUrl);
                const filename = `${Date.now()}_${type}.jpg`;
                const filePath = `${userId}/${projectId}/${type}/${filename}`;

                const { error: uploadError } = await supabase.storage
                    .from('project-assets')
                    .upload(filePath, blob, {
                        contentType: 'image/jpeg',
                        cacheControl: '3600'
                    });

                if (uploadError) {
                    console.error(`Error uploading ${type} image:`, uploadError);
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('project-assets')
                        .getPublicUrl(filePath);
                    finalImageUrl = publicUrl;
                }
            } catch (compressionError) {
                console.warn("Image compression failed, skipping upload:", compressionError);
            }
        } else if (imageUrl) {
            finalImageUrl = imageUrl;
        }

        // 2. Save Artifact Record
        const { error: dbError } = await supabase
            .from('artifacts')
            .insert({
                project_id: projectId,
                user_id: userId,
                type: type,
                title: title,
                data: data,
                image_url: finalImageUrl
            });

        if (dbError) throw dbError;

        console.log(`Saved ${type} artifact successfully`);
        console.timeEnd(label);
        return true;
    } catch (error) {
        console.error(`Auto-save failed for ${type}:`, error);
        console.timeEnd(label);
        return false;
    }
};
