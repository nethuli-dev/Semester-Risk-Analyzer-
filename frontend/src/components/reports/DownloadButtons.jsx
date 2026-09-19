import Button from '../common/Button';

export default function DownloadButtons({ onPdf, onMarkdown, disabled }) {
  return (
    <div className="no-print flex gap-2" role="group" aria-label="Download report">
      <Button variant="secondary" onClick={onPdf} disabled={disabled}>
        Download PDF
      </Button>
      <Button variant="secondary" onClick={onMarkdown} disabled={disabled}>
        Download Markdown
      </Button>
    </div>
  );
}
