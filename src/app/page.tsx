import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f3f6f9] px-4">
      <div className="max-w-lg text-center">
        <p className="text-sm font-medium tracking-wide text-[#0ab39c] uppercase">
          İhsan Akyıldız
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-800">
          Web tasarım & yazılım stüdyosu
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Tanıtım sitesi ve yönetim paneli kurulumu devam ediyor.
        </p>
        <Link
          href="/admin/login"
          className="mt-8 inline-flex rounded-md bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#364574]"
        >
          Admin Giriş
        </Link>
      </div>
    </main>
  );
}
