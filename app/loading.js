import { ArticleRowSkeleton } from '../components/cards';

export default function Loading() {
  return (
    <div>
      <div className="h-14 border-b border-rule" />
      <div className="h-10 bg-rule/30" />
      <div className="w-full aspect-[4/3] bg-rule animate-pulse" />
      <ArticleRowSkeleton />
      <ArticleRowSkeleton />
      <ArticleRowSkeleton />
      <ArticleRowSkeleton />
    </div>
  );
}
