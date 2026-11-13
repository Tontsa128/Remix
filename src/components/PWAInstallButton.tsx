import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="Asenna sovellus puhelimeen"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#EAF2EE] px-3 text-xs font-semibold text-[#1E3F35] transition-colors hover:bg-[#DCEAE2]"
      >
        <Download size={15} aria-hidden="true" />
        <span>Asenna</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Asenna sovellus iPhonelle"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#EAF2EE] px-3 text-xs font-semibold text-[#1E3F35] transition-colors hover:bg-[#DCEAE2]"
        >
          <Share size={15} aria-hidden="true" />
          <span>Asenna</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-[#142620] shadow-xl">
              <div className="flex items-center justify-between">
                <h2 id="ios-install-title" className="text-base font-bold">
                  Asenna Elovio iPhonelle
                </h2>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Sulje asennusohje"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#4A5D55]"
                >
                  <X size={18} />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-[#385348]">
                <li>
                  1. Napauta Safarin alareunan <strong>Jaa</strong>-kuvaketta.
                </li>
                <li>
                  2. Valitse listalta <strong>Lisää Koti-valikkoon</strong>.
                </li>
                <li>
                  3. Napauta <strong>Lisää</strong> — Elovio toimii nyt omana
                  sovelluksenaan.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 min-h-[44px] w-full rounded-xl bg-[#1E3F35] text-sm font-semibold text-white"
              >
                Selvä
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
