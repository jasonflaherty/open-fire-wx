'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L, { type LatLng, type LeafletMouseEvent, type Map as LeafletMap } from 'leaflet';
import {
  fetchNoaaPointWeather,
  formatNoaaWeatherPopupHtml,
} from '@openfirewx/weather';

const HOLD_MS = 550;
const MOVE_TOLERANCE_PX = 12;

async function showNoaaWeather(map: LeafletMap, latlng: LatLng) {
  const popup = L.popup({
    maxWidth: 280,
    className: 'ofwx-wx-leaflet-popup',
    autoPanPadding: [48, 72],
  })
    .setLatLng(latlng)
    .setContent(
      '<div class="ofwx-wx-popup ofwx-wx-popup--loading">Loading NOAA weather…</div>',
    )
    .openOn(map);

  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(12);
    }
    const wx = await fetchNoaaPointWeather(latlng.lat, latlng.lng);
    popup.setContent(formatNoaaWeatherPopupHtml(wx));
  } catch {
    popup.setContent(
      '<div class="ofwx-wx-popup"><strong>Weather unavailable</strong><p class="ofwx-wx-popup__meta">NOAA/NWS has no forecast for this point (or the request failed).</p></div>',
    );
  }
}

function latLngFromTouch(map: LeafletMap, container: HTMLElement, touch: Touch): LatLng {
  const rect = container.getBoundingClientRect();
  return map.containerPointToLatLng(
    L.point(touch.clientX - rect.left, touch.clientY - rect.top),
  );
}

/**
 * Long-press (or right-click) anywhere on the map to load NOAA/NWS forecast.
 */
export function LongPressWeather() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let startPoint: { x: number; y: number } | null = null;
    let startLatLng: LatLng | null = null;
    let triggered = false;
    let touchActive = false;

    const clearHold = () => {
      if (holdTimer != null) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      startPoint = null;
      startLatLng = null;
    };

    const armHold = (clientX: number, clientY: number, latlng: LatLng) => {
      clearHold();
      triggered = false;
      startPoint = { x: clientX, y: clientY };
      startLatLng = latlng;
      holdTimer = setTimeout(() => {
        if (!startLatLng) return;
        triggered = true;
        const target = startLatLng;
        clearHold();
        void showNoaaWeather(map, target);
      }, HOLD_MS);
    };

    const movedTooFar = (clientX: number, clientY: number) => {
      if (!startPoint) return false;
      const dx = clientX - startPoint.x;
      const dy = clientY - startPoint.y;
      return Math.hypot(dx, dy) > MOVE_TOLERANCE_PX;
    };

    const onMouseDown = (event: LeafletMouseEvent) => {
      if (touchActive) return;
      if (event.originalEvent.button !== 0) return;
      armHold(event.originalEvent.clientX, event.originalEvent.clientY, event.latlng);
    };

    const onMouseMove = (event: LeafletMouseEvent) => {
      if (!startPoint || touchActive) return;
      if (movedTooFar(event.originalEvent.clientX, event.originalEvent.clientY)) {
        clearHold();
      }
    };

    const onMouseUp = () => {
      if (!touchActive) clearHold();
    };

    const onContextMenu = (event: LeafletMouseEvent) => {
      event.originalEvent.preventDefault();
      clearHold();
      void showNoaaWeather(map, event.latlng);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchActive = true;
      if (event.touches.length !== 1) {
        clearHold();
        return;
      }
      const touch = event.touches[0];
      armHold(touch.clientX, touch.clientY, latLngFromTouch(map, container, touch));
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!startPoint || event.touches.length !== 1) {
        clearHold();
        return;
      }
      const touch = event.touches[0];
      if (movedTooFar(touch.clientX, touch.clientY)) {
        clearHold();
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (triggered) {
        event.preventDefault();
      }
      clearHold();
      triggered = false;
      window.setTimeout(() => {
        touchActive = false;
      }, 50);
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    map.on('contextmenu', onContextMenu);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onTouchEnd);

    return () => {
      clearHold();
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      map.off('contextmenu', onContextMenu);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [map]);

  return null;
}
