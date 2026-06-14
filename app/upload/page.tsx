import Link from "next/link";

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-[#050814] text-white">
      <div className="mx-auto max-w-5xl px-6 py-20">

        {/* TITLU */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold">
            Încărcare documente
          </h1>

          <p className="mt-3 text-slate-400">
            Încarcă documentele necesare pentru verificarea de cenzorat.
          </p>
        </div>

        {/* FORMULAR */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">

          <div className="grid gap-6 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm">
                Asociație
              </label>

              <select className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <option>Asociația de Proprietari</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">
                Tip document
              </label>

              <select className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <option>Extras cont</option>
                <option>Facturi</option>
                <option>Registru casă</option>
                <option>Contracte</option>
                <option>Altele</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">
                Luna
              </label>

              <input
                type="text"
                placeholder="Mai"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">
                An
              </label>

              <input
                type="number"
                defaultValue="2026"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              />
            </div>

          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm">
              Fișier PDF
            </label>

            <input
              type="file"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3"
            />
          </div>

          <button
            className="mt-8 rounded-xl bg-violet-600 px-6 py-3 font-semibold hover:bg-violet-500"
          >
            Încarcă document
          </button>

        </div>

        <div className="mt-10">
          <Link
            href="/"
            className="text-cyan-300 hover:text-cyan-200"
          >
            ← Înapoi la homepage
          </Link>
        </div>

      </div>
    </main>
  );
}