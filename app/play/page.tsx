import InstallBanner from "@/src/components/InstallBanner";
import GameBrowse from "@/src/components/GameBrowse";

export default function PlayPage() {
  return (
    <>
      <InstallBanner />
      <GameBrowse category="all" showDailyPicks />
    </>
  );
}
