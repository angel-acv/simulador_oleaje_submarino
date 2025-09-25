/* ==========================
           Simulador Oleaje + Faro + Mini Dashboard Drag/Plegable + Voltaje
           ========================== */
        let canvas, ctx, animationId, time = 0;

        let waveParams = {
          amplitude: 2.0,
          frequency: 0.8,
          speed: 3.0,
          density: 1000
        };

        const canvasConfig = {
          width: 800,
          height: 520,
          waveCount: 3,
          particleCount: 50
        };

        const lighthouseConfig = {
          maxEnergy: 25000,
          maxPowerKW: 50
        };

        const voltageConfig = {
          resistance: 20,      // Ω (ajustable)
          maxVoltage: 600,     // Voltaje máximo mostrado
          minAngle: -110,      // grados
          maxAngle: 110        // grados
        };

        let particles = [];

        /* ==========================
           INIT
           ========================== */
        function initSimulator() {
          canvas = document.getElementById('waveCanvas');
          ctx = canvas.getContext('2d');
          resizeCanvas();
          window.addEventListener('resize', resizeCanvas);
          setupControls();
          initParticles();
          setupMiniDashboardInteractivity();
          animate();
          calculateEnergy();
        }

        /* ==========================
           RESIZE & ANIMATION
           ========================== */
        function resizeCanvas() {
          const container = canvas.parentElement;
          canvas.width = container.offsetWidth - 60;
          canvas.height = Math.min(520, window.innerHeight * 0.6);
          canvasConfig.width = canvas.width;
          canvasConfig.height = canvas.height;
          
          // Ajustar cantidad de partículas según el tamaño
          const baseParticles = 50;
          canvasConfig.particleCount = Math.max(20, Math.floor(baseParticles * (canvas.width / 800)));
          
          if (particles.length !== canvasConfig.particleCount) {
            initParticles();
          }
        }

        function animate() {
          ctx.clearRect(0, 0, canvasConfig.width, canvasConfig.height);
          drawBackground();
          drawParticles();
          drawWaveLayers();
          drawDepthInfo();
          time += 0.02;
          animationId = requestAnimationFrame(animate);
        }

        /* ==========================
           BACKGROUND
           ========================== */
        function drawBackground() {
          const g = ctx.createLinearGradient(0, 0, 0, canvasConfig.height);
          g.addColorStop(0, 'rgba(0,26,51,0.5)');
          g.addColorStop(0.3, 'rgba(0,61,102,0.4)');
          g.addColorStop(0.7, 'rgba(0,102,204,0.35)');
          g.addColorStop(1, 'rgba(0,133,255,0.3)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, canvasConfig.width, canvasConfig.height);
          drawLightRays();
        }

        function drawLightRays() {
          ctx.save();
          const rayCount = Math.max(2, Math.floor(canvasConfig.width / 300));
          for (let i = 0; i < rayCount; i++) {
            const x = (canvasConfig.width / (rayCount + 1)) * (i + 1) + Math.sin(time + i) * 20;
            const grad = ctx.createLinearGradient(x, 0, x + 50, canvasConfig.height);
            grad.addColorStop(0, 'rgba(127,219,255,0.08)');
            grad.addColorStop(0.5, 'rgba(127,219,255,0.04)');
            grad.addColorStop(1, 'rgba(127,219,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x, 0, 50, canvasConfig.height);
          }
          ctx.restore();
        }

        /* ==========================
           PARTICLES
           ========================== */
        function initParticles() {
          particles = [];
          for (let i = 0; i < canvasConfig.particleCount; i++) {
            particles.push({
              x: Math.random() * canvasConfig.width,
              y: Math.random() * canvasConfig.height,
              size: Math.random() * 3 + 1,
              speedX: (Math.random() - 0.5) * 0.5,
              speedY: (Math.random() - 0.5) * 0.3,
              opacity: Math.random() * 0.5 + 0.2
            });
          }
        }

        function drawParticles() {
          particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY + Math.sin(time + p.x * 0.01) * 0.2;
            if (p.x < 0 || p.x > canvasConfig.width) p.speedX *= -1;
            if (p.y < 0 || p.y > canvasConfig.height) p.speedY *= -1;
            p.x = Math.max(0, Math.min(canvasConfig.width, p.x));
            p.y = Math.max(0, Math.min(canvasConfig.height, p.y));
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = '#7FDBFF';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
        }

        /* ==========================
           WAVES
           ========================== */
        function drawWaveLayers() {
          const layers = [
            { color: 'rgba(0,116,217,0.55)', amplitude: 1.0, frequency: 1.0, phase: 0 },
            { color: 'rgba(57,204,204,0.40)', amplitude: 0.7, frequency: 1.2, phase: Math.PI / 3 },
            { color: 'rgba(127,219,255,0.28)', amplitude: 0.5, frequency: 0.8, phase: Math.PI / 2 }
          ];
          layers.forEach((l, i) => drawWaveLayer(l, i));
        }

        function drawWaveLayer(layer, index) {
          ctx.save();
          ctx.fillStyle = layer.color;
          ctx.strokeStyle = layer.color.replace(/[\d.]+\)/, '0.8)');
          ctx.lineWidth = 2;
          const baseY = canvasConfig.height * 0.3 + index * (canvasConfig.height * 0.15);
          const pts = [];
          const step = Math.max(3, Math.floor(canvasConfig.width / 150));
          
          for (let x = 0; x <= canvasConfig.width + 20; x += step) {
            const h = Math.sin(
              (x * waveParams.frequency * layer.frequency * 0.01) +
              (time * waveParams.speed * 0.5) + layer.phase
            ) * waveParams.amplitude * layer.amplitude * (canvasConfig.height / 52);
            pts.push({ x, y: baseY + h });
          }
          
          if (pts.length) {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length - 2; i++) {
              const cpX = (pts[i].x + pts[i + 1].x) / 2;
              const cpY = (pts[i].y + pts[i + 1].y) / 2;
              ctx.quadraticCurveTo(pts[i].x, pts[i].y, cpX, cpY);
            }
            ctx.lineTo(canvasConfig.width, canvasConfig.height);
            ctx.lineTo(0, canvasConfig.height);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length - 2; i++) {
              const cpX = (pts[i].x + pts[i + 1].x) / 2;
              const cpY = (pts[i].y + pts[i + 1].y) / 2;
              ctx.quadraticCurveTo(pts[i].x, pts[i].y, cpX, cpY);
            }
            ctx.stroke();
          }
          ctx.restore();
        }

        /* ==========================
           DEPTH INFO
           ========================== */
        function drawDepthInfo() {
          ctx.save();
          ctx.fillStyle = 'rgba(127,219,255,0.65)';
          const fontSize = Math.max(12, Math.floor(canvasConfig.width / 50));
          ctx.font = `${fontSize}px Arial`;
          ctx.textAlign = 'left';
          
          const depths = [10, 20, 30];
          const spacing = canvasConfig.height / (depths.length + 2);
          
          depths.forEach((d, i) => {
            const y = spacing * (i + 1);
            ctx.fillText(`${d}m`, 20, y);
            ctx.save();
            ctx.strokeStyle = 'rgba(127,219,255,0.25)';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(60, y - 5);
            ctx.lineTo(canvasConfig.width - 20, y - 5);
            ctx.stroke();
            ctx.restore();
          });
          ctx.restore();
        }

        /* ==========================
           CONTROLES
           ========================== */
        function setupControls() {
          const a = document.getElementById('amplitudeSlider');
          const f = document.getElementById('frequencySlider');
          const s = document.getElementById('speedSlider');

          a.addEventListener('input', e => {
            waveParams.amplitude = parseFloat(e.target.value);
            document.getElementById('amplitudeValue').textContent =
              waveParams.amplitude.toFixed(1) + ' m';
            calculateEnergy();
          });
          f.addEventListener('input', e => {
            waveParams.frequency = parseFloat(e.target.value);
            document.getElementById('frequencyValue').textContent =
              waveParams.frequency.toFixed(1) + ' Hz';
            calculateEnergy();
          });
          s.addEventListener('input', e => {
            waveParams.speed = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent =
              waveParams.speed.toFixed(1) + ' m/s';
            calculateEnergy();
          });
        }

        /* ==========================
           ENERGÍA / MEDIDORES
           ========================== */
        function calculateEnergy() {
          const energy =
            0.5 *
            waveParams.density *
            Math.pow(waveParams.amplitude, 2) *
            waveParams.frequency *
            waveParams.speed;

          const energyEl = document.getElementById('energyValue');
          if (energyEl) {
            energyEl.textContent = Math.round(energy).toLocaleString();
          }

          updateHarpoonMeter(energy);
          updateLighthouse(energy);
        }

        function updateHarpoonMeter(energy) {
          const maxEnergy = lighthouseConfig.maxEnergy;
          const pct = Math.min((energy / maxEnergy) * 100, 100);
          const needle = document.getElementById('harpoonNeedle');
          const glow = document.getElementById('harpoonGlow');
          const level = document.getElementById('powerLevel');
          if (!needle || !glow) return;

          const parent = glow.parentElement;
          const maxPos = parent.offsetWidth - 70;
          needle.style.left = (pct / 100) * maxPos + 'px';
          glow.style.width = pct + '%';

          let txt = 'Bajo', color = '#39CCCC';
          if (pct >= 75) { txt = 'MÁXIMO'; color = '#FF6B6B'; }
          else if (pct >= 50) { txt = 'Alto'; color = '#FFD700'; }
          else if (pct >= 25) { txt = 'Medio'; color = '#7FDBFF'; }

          level.textContent = txt;
          level.style.color = color;
          needle.style.animation = (pct >= 75) ? 'harpoonVibrate 0.1s infinite' : 'none';
        }

        function updateLighthouse(energy) {
          const pct = Math.min((energy / lighthouseConfig.maxEnergy) * 100, 100);
          const powerKW = lighthouseConfig.maxPowerKW * (pct / 100);

          const powerFill = document.getElementById('lighthousePowerFill');
          const powerNum = document.getElementById('lighthousePowerNumeric');
          const intensityLabel = document.getElementById('beamIntensityLabel');
          const core = document.getElementById('lightCore');
          const beam = document.getElementById('lightBeam');

          if (powerFill) powerFill.style.width = pct + '%';
          if (powerNum) powerNum.textContent = powerKW.toFixed(2);

          if (core) {
            const scale = 1 + pct / 180;
            core.style.transform = `translate(-50%,-50%) scale(${scale})`;
            core.style.filter = `drop-shadow(0 0 ${5 + pct / 6}px rgba(200,240,255,0.8))`;
          }
          if (beam) {
            beam.style.opacity = (0.2 + pct / 350).toFixed(3);
          }

          let label = 'Baja';
          if (pct >= 75) label = 'Muy Alta';
          else if (pct >= 50) label = 'Alta';
          else if (pct >= 30) label = 'Media';
          if (intensityLabel) intensityLabel.textContent = label;
        }

        /* ==========================
           MINI DASHBOARD (Drag + Collapse)
           ========================== */
        function setupMiniDashboardInteractivity() {
          const dashboard = document.getElementById('miniDashboard');
          const header = document.getElementById('miniHeader');
          const toggleBtn = document.getElementById('miniToggle');
          if (!dashboard || !header || !toggleBtn) return;

          let dragging = false;
          let offsetX = 0;
          let offsetY = 0;

          // Soporte para touch
          const getEventPos = (e) => {
            return {
              x: e.type.includes('touch') ? e.touches[0].clientX : e.clientX,
              y: e.type.includes('touch') ? e.touches[0].clientY : e.clientY
            };
          };

          const startDrag = (e) => {
            if (e.target === toggleBtn) return;
            e.preventDefault();
            dragging = true;
            dashboard.classList.add('dragging');
            const rect = dashboard.getBoundingClientRect();
            const pos = getEventPos(e);
            offsetX = pos.x - rect.left;
            offsetY = pos.y - rect.top;

            dashboard.style.bottom = 'auto';
            dashboard.style.right = 'auto';
          };

          const doDrag = (e) => {
            if (!dragging) return;
            e.preventDefault();
            const stage = document.querySelector('.simulator-stage');
            const stageRect = stage.getBoundingClientRect();
            const pos = getEventPos(e);

            let x = pos.x - stageRect.left - offsetX;
            let y = pos.y - stageRect.top - offsetY;

            const maxX = stageRect.width - dashboard.offsetWidth;
            const maxY = stageRect.height - dashboard.offsetHeight;
            x = Math.max(0, Math.min(maxX, x));
            y = Math.max(0, Math.min(maxY, y));

            dashboard.style.left = x + 'px';
            dashboard.style.top = y + 'px';
            dashboard.classList.add('custom-position');
          };

          const endDrag = () => {
            if (dragging) {
              dragging = false;
              dashboard.classList.remove('dragging');
            }
          };

          // Mouse events
          header.addEventListener('mousedown', startDrag);
          window.addEventListener('mousemove', doDrag);
          window.addEventListener('mouseup', endDrag);

          // Touch events
          header.addEventListener('touchstart', startDrag);
          window.addEventListener('touchmove', doDrag);
          window.addEventListener('touchend', endDrag);

          toggleBtn.addEventListener('click', () => {
            const collapsed = dashboard.getAttribute('data-collapsed') === 'true';
            dashboard.setAttribute('data-collapsed', String(!collapsed));
            toggleBtn.textContent = collapsed ? '−' : '+';
          });
        }

        /* ==========================
           EVENTS
           ========================== */
        document.addEventListener('DOMContentLoaded', initSimulator);
        window.addEventListener('beforeunload', () => {
          if (animationId) cancelAnimationFrame(animationId);
        });

        // Detectar cambios de orientación
        window.addEventListener('orientationchange', () => {
          setTimeout(resizeCanvas, 100);
        });