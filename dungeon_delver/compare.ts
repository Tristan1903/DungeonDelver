const DetailedClassView = ({ data }: { data: any }) => {
    const info = data.info;
    const features = data.features || [];

    // 1. UNIQUE-IFY SUBCLASSES: Only show each name once
    const subclasses = (data.subclasses || []).reduce((acc: any[], current: any) => {
      const x = acc.find(item => item.name === current.name);
      if (!x) return acc.concat([current]);
      // Priority: If we find a version from XPHB, use that one
      if (current.source === 'XPHB') {
        return acc.map(item => item.name === current.name ? current : item);
      }
      return acc;
    }, []);

    return (
      <div style={detailOverlayStyle}>
        {/* 1. TOP NAV */}
        <div style={detailNavStyle}>
          <button onClick={() => setInspectingClass(null)} style={detailBackButtonStyle}>← BACK</button>
          <button
            onClick={() => { setDraft({ ...draft, class: info.name }); setInspectingClass(null); setActiveSection(null); }}
            style={detailSelectButtonStyle}
          >
            SELECT {info.name.toUpperCase()}
          </button>
        </div>

        {/* 2. HERO SECTION */}
        {/* NOTE: Make sure your image is at public/img/classes/landscapes/Cleric.webp */}
        <div style={{
          ...heroSectionStyle,
          backgroundImage: `url("/img/classes/landscapes/${info.name}.webp")`,
          backgroundColor: '#0a0d12' // Dark fallback
        }}>
          <div style={heroGradientStyle} />

          <div style={goldBorderWrap}>
            <div style={heroContentStyle}>
              {/* THE BANNER FLAG */}
              <div style={{ ...classBannerContainer, position: 'relative', left: 0, top: 0, marginBottom: '20px' }}>
                <img
                  src={`/img/classes/${info.name}.png`}
                  style={classIconOnBannerStyle}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>

              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#cbd5e0', letterSpacing: '2px' }}>PLAYER'S HANDBOOK</div>
              <h1 style={{ fontSize: '5rem', margin: '0 0 10px 0', fontFamily: 'serif' }}>{info.name}</h1>
              <h3 style={{ fontSize: '1.2rem', color: '#f6e05e', textTransform: 'uppercase', marginBottom: '20px' }}>
                A VERSATILE MASTER OF ADVENTURE
              </h3>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={pillBadgeStyle}>{info.name.toUpperCase()} WARRIOR</div>
                <div style={pillBadgeStyle}>{info.spellcastingAbility?.toUpperCase() || 'WISDOM'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. CONTENT AREA */}
        <div style={infoGridContainerStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', marginBottom: '60px' }}>
            <div>
              <div style={sectionLabelStyle}>CLASS HIGHLIGHTS</div>
              <h2 style={sectionTitleStyle}>How it feels to play</h2>
              <ul style={loreListStyle}>
                <li>Focus on strategic combat and survivability.</li>
                <li>Unleash unique class-specific resources.</li>
                <li>Lead your party with specialized tactical skills.</li>
              </ul>
            </div>

            <div>
              <div style={sectionLabelStyle}>STARTING CLASS FEATURES</div>
              <h2 style={sectionTitleStyle}>What are their abilities?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {features.filter((f: any) => f.level === 1).slice(0, 4).map((f: any, i: number) => (
                  <div key={i} style={{ color: '#cbd5e0', fontSize: '1.1rem' }}>
                    <strong style={{ color: 'white' }}>{cleanString(f.name)}:</strong> {getRacePreview([f])}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. GEAR BOX */}
          <div style={gearBoxStyle}>
            <div style={{ flex: 1, display: 'flex', gap: '40px', alignItems: 'center' }}>
              <img
                src={`/img/classes/gear/${info.name}.png`}
                style={{ width: '300px', filter: 'drop-shadow(0 0 15px rgba(0,0,0,0.5))' }}
                onError={(e) => e.currentTarget.style.display = 'none'}
              />
              <div>
                <div style={sectionLabelStyle}>ICONIC GEAR</div>
                <h2 style={{ ...sectionTitleStyle, fontSize: '2rem' }}>What equipment do they carry?</h2>
                <ul style={loreListStyle}>
                  <li>Starting armor and weapon sets</li>
                  <li>Adventuring packs and tools</li>
                  <li>Class-specific unique items</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 5. SUBCLASSES (Show all unique versions) */}
          <div style={{ marginTop: '80px' }}>
            <div style={sectionLabelStyle}>{info.name.toUpperCase()} PATHS</div>
            <h2 style={sectionTitleStyle}>What type of {info.name} will you be?</h2>
            <p style={{ color: '#a0aec0', marginBottom: '40px' }}>At later levels you'll choose a Path.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
              {subclasses.map((sub: any) => {
                const parentClass = info.name;
                const subName = sub.name;
                const folderPath = encodeURIComponent(parentClass);
                const fileName = encodeURIComponent(`${subName} ${parentClass}.webp`);

                const imagePath = `/img/classes/subclasses/${folderPath}/${fileName}`;

                return (
                  <div key={`${sub.name}-${sub.source}`} style={subclassCardStyle}>
                    <div style={{
                      ...cardArtStyle,
                      backgroundImage: `url("${imagePath}")`,
                      opacity: 0.5,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center top'
                    }} />

                    <div style={cardGradientOverlay} />

                    <div style={{ position: 'relative', zIndex: 3, padding: '25px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#b8860b', fontWeight: 'bold' }}>Sub Class</div>
                      <h3 style={{ fontSize: '1.8rem', margin: '5px 0', fontFamily: 'serif' }}>{sub.name}</h3>
                      <div style={{ fontSize: '0.7rem', color: '#a0aec0' }}>{sub.source}</div>
                    </div>
                    <div style={goldCornerTL} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ height: '150px' }} />
      </div>
    );
  };