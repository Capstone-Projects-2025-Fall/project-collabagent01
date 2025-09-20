/**
 * Component to show a ping dot in the top right corner of the screen to indicate
 * that a student is waiting to join the class.
 * @returns {JSX.Element} The ping dot component.
 */
export const PingDot = () => (
  <span className="absolute top-3 right-3">
    <span className="flex h-3 w-3 relative">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white" />
    </span>
  </span>
);

export default PingDot;
