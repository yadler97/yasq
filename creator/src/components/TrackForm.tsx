import type { Tag } from '@yasq/shared';

interface TrackFormProps {
  isEditing: boolean;
  game: string;
  setGame: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  audioFilename: string;
  setAudioFile: (file: File | null) => void;
  setAudioFilename: (val: string) => void;
  coverFilename: string;
  setCoverFile: (file: File | null) => void;
  setCoverFilename: (val: string) => void;
  tags: Tag[];
  addTagField: () => void;
  removeTag: (index: number) => void;
  updateTag: (index: number, field: 'type' | 'value', val: string) => void;
  onSubmit: (e: Event) => void;
  onCancel: () => void;
}

export function TrackForm({
  isEditing,
  game,
  setGame,
  title,
  setTitle,
  audioFilename,
  setAudioFile,
  setAudioFilename,
  coverFilename,
  setCoverFile,
  setCoverFilename,
  tags,
  addTagField,
  removeTag,
  updateTag,
  onSubmit,
  onCancel,
}: TrackFormProps) {
  return (
    <>
      <div className="tab-actions">
        <button
          onClick={onCancel}
          className="secondary-btn"
        >
          ← Back to List
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="creator-form"
      >
        <h3>{isEditing ? 'Edit Track' : 'Add New Track'}</h3>

        <div className="field">
          <label>Game Name</label>
          <input
            type="text"
            required
            value={game}
            onInput={e => setGame((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="field">
          <label>Track Title</label>
          <input
            type="text"
            required
            value={title}
            onInput={e => setTitle((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="field">
          <label>Audio File</label>
          <input
            type="file"
            accept="audio/*"
            required={!isEditing && !audioFilename}
            onChange={e => {
              const files = (e.target as HTMLInputElement).files;
              if (files && files[0]) {
                setAudioFile(files[0]);
                setAudioFilename(files[0].name);
              }
            }}
          />
          {audioFilename && <small>Current audio file: {audioFilename}</small>}
        </div>

        <div className="field">
          <label>Cover Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => {
              const files = (e.target as HTMLInputElement).files;
              if (files && files[0]) {
                setCoverFile(files[0]);
                setCoverFilename(files[0].name);
              }
            }}
          />
          {coverFilename && <small>Current cover file: {coverFilename}</small>}
        </div>

        <div className="field">
          <label>Tags</label>
          {tags.map((tag, index) => (
            <div
              key={index}
              className="tag-row"
            >
              <input
                type="text"
                placeholder="Type"
                value={tag.type}
                onInput={e => updateTag(index, 'type', (e.target as HTMLInputElement).value)}
              />
              <input
                type="text"
                placeholder="Value"
                value={tag.value}
                onInput={e => updateTag(index, 'value', (e.target as HTMLInputElement).value)}
              />
              <button
                type="button"
                onClick={() => removeTag(index)}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary-btn"
            onClick={addTagField}
          >
            + Add Tag
          </button>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="primary-btn"
          >
            {isEditing ? 'Update Track' : 'Save Track'}
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
