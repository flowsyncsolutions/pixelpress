import { getGameBySlug } from "@/src/lib/games";
import PlayGameClient from "./PlayGameClient";
import { notFound } from "next/navigation";

type PlayGamePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PlayGamePage({ params }: PlayGamePageProps) {
  const { slug } = await params;
  const game = getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  return <PlayGameClient game={game} />;
}
