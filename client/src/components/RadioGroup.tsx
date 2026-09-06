import { Fragment } from 'preact';

export interface RadioOption<T> {
  label: string;
  value: T;
  className?: string;
}

interface RadioGroupProps<T> {
  name: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  groupId?: string;
}

export function RadioGroup<T extends string | number>({ name, options, value, onChange, groupId }: RadioGroupProps<T>) {
  return (
    <div
      id={groupId}
      className="button-group"
    >
      {options.map(opt => {
        const id = `${name}-${opt.value}`;
        const isChecked = value === opt.value;

        return (
          <Fragment key={String(opt.value)}>
            <input
              type="radio"
              id={id}
              name={name}
              value={String(opt.value)}
              checked={isChecked}
              onChange={() => onChange(opt.value)}
            />
            <label
              htmlFor={id}
              className={`btn-radio ${opt.className || ''} ${isChecked ? 'active' : ''}`}
            >
              {opt.label}
            </label>
          </Fragment>
        );
      })}
    </div>
  );
}
