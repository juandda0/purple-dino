import { Composition, registerRoot } from 'remotion';
import { FPS, TOTAL } from './timeline.js';
import { Trailer } from './Trailer.jsx';

function Root() {
  return <Composition id="Trailer" component={Trailer} width={1920} height={1080} fps={FPS} durationInFrames={Math.round(TOTAL * FPS)} />;
}
registerRoot(Root);
