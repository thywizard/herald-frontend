import { ArticleRowSkeleton } from '../../../components/cards';

export default function Loading() {
  return (
    <div>
      <div className="h-14 border-b border-rule" />
      <div className="h-12 bg-rule/30" />
      <ArticleRowSkeleton />
      <ArticleRowSkeleton />
      <ArticleRowSkeleton />
      <ArticleRowSkeleton />
      <ArticleRowSkeleton />
    </div>
  );
}
