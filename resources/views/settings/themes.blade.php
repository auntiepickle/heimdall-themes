@extends("layouts.app")
@section("content")
<div style="max-width:900px;margin:0 auto;padding:1.5rem 1rem;">
    <h2 style="font-weight:800;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.6);margin-bottom:.3rem;font-size:1.8rem;">Themes</h2>
    <p style="color:rgba(255,255,255,.5);text-shadow:0 1px 4px rgba(0,0,0,.4);margin-bottom:1rem;font-size:.85rem;">Click a theme to apply it.</p>
    @if(session("success"))
        <div style="background:rgba(34,197,94,.9);color:#fff;border-radius:10px;padding:.5rem .8rem;margin-bottom:.8rem;font-weight:600;font-size:.9rem;backdrop-filter:blur(8px);">{{ session("success") }}</div>
    @endif
    @if($errors->any())
        <div style="background:rgba(239,68,68,.9);color:#fff;border-radius:10px;padding:.5rem .8rem;margin-bottom:.8rem;font-weight:600;font-size:.9rem;">{{ $errors->first() }}</div>
    @endif
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.8rem;">
        {{-- Default --}}
        <form method="POST" action="{{ route('settings.themes.update') }}" style="margin:0;">
            @csrf
            <input type="hidden" name="theme_name" value="">
            <button type="submit" class="tc {{ !$activeSlug?'ta':'' }}" style="width:100%;text-align:left;cursor:pointer;border:none;padding:0;">
                <div class="tc-preview" style="background:linear-gradient(135deg,#667eea,#764ba2);">
                    <span style="font-size:1.8rem;">&#127968;</span>
                </div>
                <div class="tc-info">
                    <div class="tc-name">Default</div>
                    <div class="tc-desc">Stock Heimdall</div>
                </div>
            </button>
        </form>
        {{-- Random --}}
        <form method="POST" action="{{ route('settings.themes.update') }}" style="margin:0;">
            @csrf
            <input type="hidden" name="theme_name" value="__random__">
            <button type="submit" class="tc {{ $activeSlug==='__random__'?'ta':'' }}" style="width:100%;text-align:left;cursor:pointer;border:none;padding:0;">
                <div class="tc-preview" style="background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460,#e94560);">
                    <span style="font-size:1.8rem;">&#127922;</span>
                </div>
                <div class="tc-info">
                    <div class="tc-name">Random</div>
                    <div class="tc-desc">Different each load</div>
                </div>
            </button>
        </form>
        {{-- Themes --}}
        @foreach($themes as $theme)
        @php
            $previewStyles = [
                'lofi-night' => 'background:linear-gradient(135deg,#1e2a45 0%,#0a0a14 60%,#2d1b69 100%);',
                'terminal' => 'background:#0a0a0a;color:#00FF41;font-family:monospace;text-shadow:0 0 8px #00FF41;',
                'aurora' => 'background:linear-gradient(135deg,#020212 0%,#0e4d64 40%,#00ff87 80%,#7b2d8e 100%);',
                'woodland' => 'background:linear-gradient(135deg,#2d3b2a 0%,#4a6548 40%,#8aab86 100%);',
                'void' => 'background:#0a0a0a;',
                'rivendell' => 'background:linear-gradient(135deg,#1a150e 0%,#4a3520 30%,#29446a 70%,#0a0a14 100%);',
            ];
            $previewIcons = [
                'lofi-night' => '&#127769;',
                'terminal' => '&#62;&lowbar;',
                'aurora' => '&#10024;',
                'woodland' => '&#127807;',
                'void' => '&#9679;',
                'rivendell' => '&#127964;',
            ];
            $pStyle = $previewStyles[$theme->slug] ?? 'background:linear-gradient(135deg,#1e2a45,#0a0a14);';
            $pIcon = $previewIcons[$theme->slug] ?? '&#127912;';
        @endphp
        <form method="POST" action="{{ route('settings.themes.update') }}" style="margin:0;">
            @csrf
            <input type="hidden" name="theme_name" value="{{ $theme->slug }}">
            <button type="submit" class="tc {{ $activeSlug===$theme->slug?'ta':'' }}" style="width:100%;text-align:left;cursor:pointer;border:none;padding:0;">
                <div class="tc-preview" style="{{ $pStyle }}">
                    <span style="font-size:1.8rem;">{!! $pIcon !!}</span>
                </div>
                <div class="tc-info">
                    <div class="tc-name">{{ $theme->name }}</div>
                    <div class="tc-desc">{{ Str::limit($theme->description, 40) }}</div>
                </div>
            </button>
        </form>
        @endforeach
    </div>
</div>
<style>
.tc{border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);backdrop-filter:blur(12px);transition:all .2s ease;display:block;}
.tc:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.15);box-shadow:0 6px 20px rgba(0,0,0,.2);}
.ta{border-color:#6366f1!important;box-shadow:0 0 0 2px rgba(99,102,241,.4),0 6px 24px rgba(99,102,241,.15)!important;}
.tc-preview{height:80px;display:flex;align-items:center;justify-content:center;}
.tc-info{padding:.6rem .7rem;}
.tc-name{font-weight:700;color:#fff;font-size:.9rem;}
.tc-desc{font-size:.7rem;color:rgba(255,255,255,.45);margin-top:.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
</style>
@endsection
