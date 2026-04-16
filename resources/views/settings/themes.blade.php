@extends("layouts.app")
@section("content")
<div style="max-width:800px;margin:0 auto;padding:2rem 1rem;">
    <h2 style="font-weight:800;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.6);margin-bottom:.5rem;font-size:2rem;">Themes</h2>
    <p style="color:rgba(255,255,255,.7);text-shadow:0 1px 4px rgba(0,0,0,.4);margin-bottom:1.5rem;font-size:.9rem;">Choose a theme for your dashboard. Changes apply immediately.</p>
    @if(session("success"))
        <div style="background:rgba(34,197,94,.9);color:#fff;border-radius:12px;padding:.65rem 1rem;margin-bottom:1rem;font-weight:600;backdrop-filter:blur(8px);">&#10003; {{ session("success") }}</div>
    @endif
    @if($errors->any())
        <div style="background:rgba(239,68,68,.9);color:#fff;border-radius:12px;padding:.65rem 1rem;margin-bottom:1rem;font-weight:600;">{{ $errors->first() }}</div>
    @endif
    <form method="POST" action="{{ route('settings.themes.update') }}">
        @csrf
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1.25rem;margin-bottom:2rem;">
            {{-- Default --}}
            <label style="cursor:pointer;display:block;">
                <input type="radio" name="theme_name" value="" {{ !$activeSlug?'checked':'' }} style="display:none;" class="tr">
                <div class="tc {{ !$activeSlug?'ta':'' }}">
                    <div class="tc-preview" style="background:linear-gradient(135deg,#667eea,#764ba2);">
                        <span style="font-size:2.2rem;">&#127968;</span>
                    </div>
                    <div class="tc-info">
                        <div class="tc-name">Default</div>
                        <div class="tc-desc">Stock Heimdall — clean and simple</div>
                    </div>
                </div>
            </label>
            {{-- Themes --}}
            @foreach($themes as $theme)
            @php
                $previewStyles = [
                    'lofi-night' => 'background:linear-gradient(135deg,#1e2a45 0%,#0a0a14 60%,#2d1b69 100%);',
                    'terminal' => 'background:#0a0a0a;color:#00FF41;font-family:monospace;text-shadow:0 0 8px #00FF41;',
                    'aurora' => 'background:linear-gradient(135deg,#020212 0%,#0e4d64 40%,#00ff87 80%,#7b2d8e 100%);',
                    'paper' => 'background:linear-gradient(135deg,#2d3b2a 0%,#4a6548 40%,#8aab86 100%);',
                    'void' => 'background:#0a0a0a;',
                ];
                $previewIcons = [
                    'lofi-night' => '&#127769;',
                    'terminal' => '&#62;&lowbar;',
                    'aurora' => '&#10024;',
                    'paper' => '&#127807;',
                    'void' => '&#9679;',
                ];
                $pStyle = $previewStyles[$theme->slug] ?? 'background:linear-gradient(135deg,#1e2a45,#0a0a14);';
                $pIcon = $previewIcons[$theme->slug] ?? '&#127912;';
            @endphp
            <label style="cursor:pointer;display:block;">
                <input type="radio" name="theme_name" value="{{ $theme->slug }}" {{ $activeSlug===$theme->slug?'checked':'' }} style="display:none;" class="tr">
                <div class="tc {{ $activeSlug===$theme->slug?'ta':'' }}">
                    <div class="tc-preview" style="{{ $pStyle }}">
                        <span style="font-size:2.2rem;">{!! $pIcon !!}</span>
                    </div>
                    <div class="tc-info">
                        <div class="tc-name">{{ $theme->name }}</div>
                        <div class="tc-desc">{{ $theme->description }}</div>
                    </div>
                </div>
            </label>
            @endforeach
        </div>
        <button type="submit" class="apply-btn">Apply Theme</button>
    </form>
</div>
<style>
.tc{border-radius:16px;overflow:hidden;border:2px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);backdrop-filter:blur(16px);box-shadow:0 4px 24px rgba(0,0,0,.15);transition:all .25s ease;cursor:pointer;}
.tc:hover{transform:translateY(-4px);box-shadow:0 12px 36px rgba(0,0,0,.25);border-color:rgba(255,255,255,.25);}
.ta{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,.3),0 8px 32px rgba(99,102,241,.15)!important;}
.tc-preview{height:120px;display:flex;align-items:center;justify-content:center;position:relative;}
.tc-info{padding:.85rem 1rem;}
.tc-name{font-weight:800;color:#fff;font-size:1.05rem;text-shadow:0 1px 4px rgba(0,0,0,.3);}
.tc-desc{font-size:.78rem;color:rgba(255,255,255,.6);margin-top:.2rem;}
.apply-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:12px;padding:.85rem 2.5rem;font-weight:700;font-size:1rem;cursor:pointer;box-shadow:0 4px 20px rgba(99,102,241,.35);transition:all .2s;letter-spacing:.5px;}
.apply-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(99,102,241,.45);}
</style>
<script>document.querySelectorAll(".tr").forEach(r=>r.addEventListener("change",()=>{document.querySelectorAll(".tc").forEach(c=>c.classList.remove("ta"));r.closest(".tc")||r.nextElementSibling&&r.nextElementSibling.classList.add("ta");r.parentElement.querySelector(".tc").classList.add("ta");}));</script>
@endsection
