import Button from '../common/Button';

export default function RegenerateButton({ hasExistingReport, onClick, isSubmitting }) {
  return (
    <Button onClick={onClick} disabled={isSubmitting}>
      {isSubmitting ? 'Generating...' : hasExistingReport ? 'Regenerate report' : 'Generate report'}
    </Button>
  );
}
