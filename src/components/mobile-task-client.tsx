"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function MobileTaskClient() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function readFile(file: File, setter: (v: string) => void) {
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverDataUrl: coverPreview ?? undefined,
          backDataUrl: backPreview ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lähetys epäonnistui");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Virhe");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-[#f8f7f3] px-4 py-10">
        <Card>
          <CardContent className="space-y-4 pt-6 text-center">
            <p className="text-lg font-medium text-[#343c27]">Valmis!</p>
            <p className="text-sm text-[#343c27]/70">
              Kuvat ja takateksti (POC) on tallennettu. Palaa työpöydälle tarkistamaan
              ilmoitus.
            </p>
            <a href="/" className="inline-block text-sm underline">
              Palaa työpöydälle
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#343c27] px-4 py-6 text-[#f8f7f3]">
      <p className="text-xs uppercase tracking-wide text-[#f8f7f3]/60">Puhelintehtävä</p>
      <h1 className="mt-1 font-serif text-2xl">Kansikuva & takateksti</h1>
      <p className="mt-2 text-sm text-[#f8f7f3]/80">
        Ota kuva kannesta ja takakannesta. POC poimii kuvauksen takakannesta (simuloitu).
      </p>

      <div className="mt-6 space-y-4">
        <Card className="border-0 bg-[#f8f7f3] text-[#343c27]">
          <CardHeader>
            <h2 className="font-semibold">1. Kansikuva</h2>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFile(f, setCoverPreview);
              }}
              className="w-full text-sm"
            />
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview}
                alt="Kansi"
                className="mt-3 max-h-48 rounded-lg object-contain"
              />
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-0 bg-[#f8f7f3] text-[#343c27]">
          <CardHeader>
            <h2 className="font-semibold">2. Takakansi (teksti)</h2>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFile(f, setBackPreview);
              }}
              className="w-full text-sm"
            />
            {backPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={backPreview}
                alt="Takakansi"
                className="mt-3 max-h-48 rounded-lg object-contain"
              />
            ) : null}
          </CardContent>
        </Card>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <Button
          className="w-full"
          disabled={submitting || (!coverPreview && !backPreview)}
          onClick={submit}
        >
          {submitting ? "Lähetetään…" : "Lähetä työpöydälle"}
        </Button>
      </div>
    </div>
  );
}
