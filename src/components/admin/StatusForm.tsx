import { setRecordStatus } from '@/app/actions/admin-ops';
import { SubmitButton } from '@/components/forms';

/** Change a record's status, with an optional note and customer notification. */
export function StatusForm({ entity, id, current, options, back }: {
  entity: 'enquiries' | 'offers' | 'seller_enquiries' | 'repairs';
  id: string; current: string; options: Record<string, string>; back: string;
}) {
  return (
    <form action={setRecordStatus} className="stack card-plain">
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      <div className="form-grid">
        <div className="field"><label htmlFor={`st-${id}`}>Change status</label>
          <select id={`st-${id}`} name="status" defaultValue={current}>
            {Object.entries(options).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></div>
        <div className="field"><label htmlFor={`stn-${id}`}>Note for the timeline <span className="hint">(optional)</span></label>
          <input id={`stn-${id}`} name="note" /></div>
      </div>
      <div className="row">
        <label className="check"><input type="checkbox" name="notify" defaultChecked /> Notify the customer (account + email)</label>
        <label className="check"><input type="checkbox" name="visible" value="off" /> Keep note private (staff only)</label>
      </div>
      <div><SubmitButton className="btn btn-dark btn-small" pendingText="Saving…">Update status</SubmitButton></div>
    </form>
  );
}
