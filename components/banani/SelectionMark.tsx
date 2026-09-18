import Icon from "./Icon";
export default function SelectionMark({ selected }: { selected: boolean }) {
  return selected ? (
    <span className="demo-selection-mark" aria-hidden="true">
      <Icon i="check" size={14} />
    </span>
  ) : null;
}
