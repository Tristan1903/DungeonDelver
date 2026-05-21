const DetailedClassView = ({ data }: { data: any }) => {
    const info = data.info;
    const features = data.features || [];
    const subclasses = data.subclasses || [];
    
    // Get class specific theme, fallback to Barbarian red if missing
    const theme = CLASS_THEMES[info.name] || CLASS_THEMES.Barbarian;

    return (
        <div style={{ ...detailOverlayStyle, backgroundColor: '#0a0d12' }}>
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
            {/* 1. HERO SECTION WITH DYNAMIC COLOR */}
            <div style={{ 
                ...heroSectionStyle, 
                backgroundImage: `url("/img/classes/landscapes/${info.name}.jpg")`,
                borderBottom: `2px solid ${theme.color}` // The colored line under hero
            }}>
                {/* Dynamic Gradient based on Class Color */}
                <div style={{
                    ...heroGradientStyle,
                    background: `linear-gradient(to top, #0a0d12 0%, rgba(10, 13, 18, 0.4) 50%, transparent 100%)`
                }} />
                
                <div style={{...goldBorderWrap, borderLeft: `2px solid ${theme.color}44`, borderRight: `2px solid ${theme.color}44`}}>
                    <div style={heroContentStyle}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#cbd5e0', letterSpacing: '2px' }}>PLAYER'S HANDBOOK</div>
                        <h1 style={{ fontSize: '5.5rem', margin: '0 0 10px 0', fontFamily: 'serif' }}>{info.name}</h1>
                        <h3 style={{ fontSize: '1.2rem', color: theme.color, textTransform: 'uppercase', letterSpacing: '1px' }}>{theme.tagline}</h3>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <div style={{...pillBadgeStyle, borderColor: theme.color}}>{theme.highlights[0].split(' ')[0].toUpperCase()}</div>
                            <div style={{...pillBadgeStyle, borderColor: theme.color}}>{info.spellcastingAbility?.toUpperCase() || 'STRENGTH'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. HIGHLIGHTS & STARTING FEATURES */}
            <div style={infoGridContainerStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', marginBottom: '80px' }}>
                    <div>
                        <div style={{...sectionLabelStyle, color: theme.color}}>CLASS HIGHLIGHTS</div>
                        <h2 style={sectionTitleStyle}>How it feels to play</h2>
                        <ul style={loreListStyle}>
                            {theme.highlights.map((h: string, i: number) => <li key={i}>{h}</li>)}
                        </ul>
                    </div>

                    <div>
                        <div style={{...sectionLabelStyle, color: theme.color}}>STARTING CLASS FEATURES</div>
                        <h2 style={sectionTitleStyle}>What are their abilities?</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {features.filter((f: any) => f.level === 1).slice(0, 3).map((f: any, i: number) => (
                                <div key={i} style={{ color: '#cbd5e0', fontSize: '1.1rem' }}>
                                    <strong style={{ color: 'white' }}>{cleanString(f.name)}:</strong> {getRacePreview([f])}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. DYNAMIC GEAR SECTION */}
                <div style={{...gearBoxStyle, borderColor: theme.color, background: `${theme.color}08` }}>
                    <div style={{ flex: 1, display: 'flex', gap: '60px', alignItems: 'center' }}>
                         {/* Class Gear Image */}
                         <img 
                            src={`/img/classes/gear/${info.name}.png`} 
                            style={{ width: '350px', filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.6))' }} 
                            onError={(e) => e.currentTarget.style.display='none'}
                         />
                         <div>
                            <div style={{...sectionLabelStyle, color: theme.color}}>ICONIC GEAR</div>
                            <h2 style={{...sectionTitleStyle, fontSize: '2.2rem'}}>What equipment do they carry?</h2>
                            <ul style={loreListStyle}>
                                {theme.gear.map((g: string, i: number) => <li key={i}>{g}</li>)}
                            </ul>
                         </div>
                    </div>
                </div>

                {/* 4. SUBCLASSES (Show all) */}
                <div style={{ marginTop: '100px' }}>
                    <div style={{...sectionLabelStyle, color: theme.color}}>{info.name.toUpperCase()} PATHS</div>
                    <h2 style={sectionTitleStyle}>What type of {info.name} will you be?</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {subclasses.map((sub: any) => (
                            <div key={sub.name} style={{...subclassCardStyle, borderColor: `${theme.color}44`}}>
                                <div style={{...cardArtStyle, backgroundImage: `url("/img/classes/subclasses/${info.name}/${sub.name} ${info.name}.webp")`, opacity: 0.5}} />
                                <div style={cardGradientOverlay} />
                                <div style={{ position: 'relative', zIndex: 3, padding: '20px' }}>
                                    <h3 style={{ fontSize: '1.6rem', margin: '5px 0' }}>{sub.name}</h3>
                                    <div style={{ fontSize: '0.7rem', color: theme.color, fontWeight: 'bold' }}>{sub.source}</div>
                                </div>
                                <div style={{...goldCornerTL, borderColor: theme.color}} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};