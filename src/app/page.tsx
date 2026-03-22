import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            BTB
          </h1>
          <p className="text-xl font-semibold text-foreground">
            Dein Bautagesbericht
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Schnell erstellt, perfekt dokumentiert, einfach gemanagt.
            Digitale Baustellenberichte für Bauleiter und Poliere –
            ohne Papierkram, ohne Aufwand.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="font-semibold">
            <Link href="/register">Jetzt starten</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-semibold">
            <Link href="/login">Einloggen</Link>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="space-y-1">
            <div className="text-primary font-bold text-lg">1 Min.</div>
            <div className="text-xs text-muted-foreground">bis zum ersten Bericht</div>
          </div>
          <div className="space-y-1">
            <div className="text-primary font-bold text-lg">DIN A4</div>
            <div className="text-xs text-muted-foreground">druckfertige Ausgabe</div>
          </div>
          <div className="space-y-1">
            <div className="text-primary font-bold text-lg">Cloud</div>
            <div className="text-xs text-muted-foreground">sicher gespeichert</div>
          </div>
        </div>
      </div>
    </div>
  )
}
