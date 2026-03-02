import React from 'react';
import { googleMapHtml } from './GoogleMapHTML';

interface MapIframeProps {
  onIframeReady: () => void;
  iframeRef: React.RefObject<any>;
}

const MapIframe = React.memo(({ onIframeReady, iframeRef }: MapIframeProps) => {
  return React.createElement('iframe', {
    ref: iframeRef,
    srcDoc: googleMapHtml,
    style: {
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
    },
    sandbox: 'allow-same-origin allow-scripts allow-popups allow-presentation',
    onLoad: onIframeReady,
  } as any);
});

MapIframe.displayName = 'MapIframe';

export default MapIframe;
