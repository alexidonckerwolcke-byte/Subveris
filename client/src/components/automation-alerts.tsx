import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Subscription } from '@shared/schema';

interface AutomationAlertsProps {
  zeroUsageSubscriptions: Subscription[];
}

const guideSlugs: Record<string, string> = {
  Netflix: 'cancel-netflix',
  'Spotify Premium': 'cancel-spotify',
  'Amazon Prime': 'cancel-amazon-prime',
  'Disney Plus': 'cancel-disney-plus',
  'YouTube Premium': 'cancel-youtube-premium',
  'HBO Max': 'cancel-hbo-max',
  'Tinder Gold': 'cancel-tinder-gold',
  'LinkedIn Premium': 'cancel-linkedin-premium',
  HelloFresh: 'cancel-hellofresh',
  iCloud: 'cancel-icloud',
  'Canva Pro': 'cancel-canva-pro',
  'Microsoft 365': 'cancel-microsoft-365',
  NordVPN: 'cancel-nordvpn',
  'PlayStation Plus': 'cancel-playstation-plus',
  'Xbox Game Pass': 'cancel-xbox-game-pass',
  Audible: 'cancel-audible',
  Readly: 'cancel-readly',
  'Duolingo Plus': 'cancel-duolingo',
  Viaplay: 'cancel-viaplay',
  Adobe: 'cancel-adobe',
};

export function AutomationAlerts({
  zeroUsageSubscriptions,
}: AutomationAlertsProps) {
  const hasZeroUsage = zeroUsageSubscriptions.length > 0;

  return (
    <div className="space-y-4">
      {hasZeroUsage && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Zero-usage alert</p>
                  <h3 className="mt-1 text-xl font-semibold">We noticed subscriptions you haven’t used in a while.</h3>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    These services appear inactive. Open the Subveris guide and complete any cancellation directly with the provider.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {zeroUsageSubscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-background/70 px-3 py-2">
                    <div>
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-xs text-muted-foreground">No recent usage detected</p>
                    </div>
                    {guideSlugs[sub.name] ? (
                      <a
                        href={`/${guideSlugs[sub.name]}`}
                        className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 px-3 py-2 text-sm font-medium hover:bg-amber-500/10"
                      >
                        View guide
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Guide coming soon</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
