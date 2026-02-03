
import React, { useState, useEffect, useRef } from 'react';
import { HostedAsset } from '../types';
import { saveHostedAsset, getAllHostedAssets, deleteHostedAsset } from '../services/storage';

const AssetLibrary: React.FC = () => {
  const [hostedAssets, setHostedAssets] = useState<HostedAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    const assets = await getAllHostedAssets();
    setHostedAssets(assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const assetId = Math.random().toString(36).substr(2, 6);
      
      const newAsset: HostedAsset = {
        id: assetId,
        title: file.name.split('.')[0],
        fileName: file.name,
        data: base64,
        mimeType: file.type,
        url: `https://eduworld.ct.ws/cdn/${assetId}`,
        createdAt: new Date(),
      };

      await saveHostedAsset(newAsset);
      await loadAssets();
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const triggerLocalDownload = async (asset: HostedAsset) => {
    if (asset && asset.data) {
      let blob: Blob;
      if (asset.data instanceof Blob) {
        blob = asset.data;
      } else {
        const res = await fetch(asset.data as string);
        blob = await res.blob();
      }
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = asset.fileName || 'asset';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(localUrl), 100);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleDeleteAsset = async (id: string) => {
    if (confirm('Permanently purge this asset from the library?')) {
      await deleteHostedAsset(id);
      setHostedAssets(prev => prev.filter(a => a.id !== id));
    }
  };

  const getAssetIcon = (mime: string) => {
    if (mime.includes('image')) return 'fa-file-image text-emerald-400';
    if (mime.includes('video')) return 'fa-file-video text-indigo-400';
    if (mime.includes('pdf')) return 'fa-file-pdf text-rose-400';
    if (mime.includes('android') || mime.includes('package')) return 'fa-robot text-amber-400';
    return 'fa-file-zipper text-slate-400';
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-3