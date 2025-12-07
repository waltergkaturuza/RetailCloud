import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';

// Common shortcuts for the application
export function useAppShortcuts() {
  const navigate = useNavigate();

  useHotkeys(
    'ctrl+k, cmd+k',
    (e) => {
      e.preventDefault();
      const event = new CustomEvent('openGlobalSearch');
      window.dispatchEvent(event);
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'], enableOnContentEditable: true }
  );

  useHotkeys(
    'ctrl+1, cmd+1',
    (e) => {
      e.preventDefault();
      navigate('/');
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'], enableOnContentEditable: true }
  );

  useHotkeys(
    'ctrl+2, cmd+2',
    (e) => {
      e.preventDefault();
      navigate('/pos');
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'], enableOnContentEditable: true }
  );

  useHotkeys(
    'ctrl+3, cmd+3',
    (e) => {
      e.preventDefault();
      navigate('/products');
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'], enableOnContentEditable: true }
  );

  useHotkeys(
    'ctrl+4, cmd+4',
    (e) => {
      e.preventDefault();
      navigate('/sales');
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'], enableOnContentEditable: true }
  );

  useHotkeys(
    'esc',
    () => {
      const event = new CustomEvent('closeModals');
      window.dispatchEvent(event);
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'], enableOnContentEditable: true }
  );
}
