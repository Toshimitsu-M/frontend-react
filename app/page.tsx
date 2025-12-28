"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type FileRecord = {
  id: string;
  fileName: string;
  size: number;
  uploadedAt: string;
  contentType?: string;
  description?: string;
};

const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(sizeInBytes) / Math.log(1024));
  const size = sizeInBytes / 1024 ** index;
  return `${size.toFixed(1)} ${units[index]}`;
};

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function FileManagerPage() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalSize = useMemo(
    () => files.reduce((acc, file) => acc + file.size, 0),
    [files],
  );

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/files", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("ファイル一覧の取得に失敗しました。");
      }

      const payload = await response.json();
      setFiles(payload.files ?? payload ?? []);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "予期せぬエラーが発生しました。",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("アップロードするファイルを選択してください。");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (description) {
        formData.append("description", description);
      }

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("ファイルのアップロードに失敗しました。");
      }

      setSelectedFile(null);
      setDescription("");
      await fetchFiles();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "アップロード中にエラーが発生しました。",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (file: FileRecord) => {
    setActiveDownloadId(file.id);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/files/${file.id}/download`);
      if (!response.ok) {
        throw new Error(`${file.fileName}のダウンロードに失敗しました。`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "ダウンロード中にエラーが発生しました。",
      );
    } finally {
      setActiveDownloadId(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("ファイルの削除に失敗しました。");
      }

      setFiles((previous) => previous.filter((file) => file.id !== fileId));
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "削除中にエラーが発生しました。",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-6 pb-20 pt-14 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="flex flex-col gap-4 rounded-2xl bg-white/80 p-8 shadow-lg shadow-indigo-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-indigo-600">File Data Console</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                ファイルデータ管理
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                ファイルのアップロード、ダウンロード、削除をバックエンド経由で安全に管理します。
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">
              S3 バケットに安全に保存
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs text-slate-500">ファイル数</p>
              <p className="text-2xl font-semibold text-slate-900">{files.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs text-slate-500">合計サイズ</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatFileSize(totalSize)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs text-slate-500">最終更新</p>
              <p className="text-2xl font-semibold text-slate-900">
                {files[0] ? formatDate(files[0].uploadedAt) : "-"}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">保存済みファイル</p>
                  <p className="text-xs text-slate-500">
                    バックエンド経由でS3に格納されたデータです。
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
                  onClick={fetchFiles}
                  disabled={isLoading}
                >
                  {isLoading ? "更新中..." : "最新の情報に更新"}
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1.5fr,1fr,1fr,1fr] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <div>ファイル名</div>
                  <div>サイズ</div>
                  <div>アップロード日時</div>
                  <div className="text-right">操作</div>
                </div>
                <div className="divide-y divide-slate-200 bg-white text-sm">
                  {files.length === 0 && !isLoading ? (
                    <p className="px-4 py-6 text-center text-slate-500">
                      保存されているファイルはありません。アップロードしてスタートしましょう。
                    </p>
                  ) : (
                    files.map((file) => (
                      <div
                        key={file.id}
                        className="grid grid-cols-[1.5fr,1fr,1fr,1fr] items-center px-4 py-3"
                      >
                        <div className="truncate pr-4">
                          <p className="font-medium text-slate-900">{file.fileName}</p>
                          {file.description && (
                            <p className="text-xs text-slate-500">{file.description}</p>
                          )}
                        </div>
                        <div className="font-medium text-slate-700">
                          {formatFileSize(file.size)}
                        </div>
                        <div className="text-slate-600">
                          {formatDate(file.uploadedAt)}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownload(file)}
                            disabled={activeDownloadId === file.id}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {activeDownloadId === file.id ? "生成中..." : "ダウンロード"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(file.id)}
                            disabled={deletingId === file.id}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === file.id ? "削除中..." : "削除"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <p className="px-4 py-4 text-center text-slate-500">読み込み中...</p>
                  )}
                </div>
              </div>
              {errorMessage && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {errorMessage}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">ファイルをアップロード</h2>
              <p className="mt-1 text-sm text-slate-500">
                選択したファイルをバックエンド経由でS3に保存します。必要に応じて説明も追加できます。
              </p>

              <form className="mt-4 space-y-4" onSubmit={handleUpload}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">ファイル</label>
                  <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-sm text-slate-600">
                    <input
                      type="file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        setSelectedFile(file ?? null);
                      }}
                      className="text-sm"
                    />
                    {selectedFile ? (
                      <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
                        <p className="font-semibold">{selectedFile.name}</p>
                        <p>
                          {formatFileSize(selectedFile.size)} ・ {selectedFile.type || "形式不明"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">最大5GBまで。ファイルを選択してください。</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">説明 (任意)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="このファイルの用途やメモを残せます"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-300 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isUploading ? "アップロード中..." : "アップロード"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">運用メモ</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>・アップロード・ダウンロード・削除は必ずバックエンド経由で実施します。</li>
                <li>・S3のオブジェクトキー管理や署名URLはバックエンド側で制御してください。</li>
                <li>・アップロード後は一覧を更新し、削除後も即座に反映されます。</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
