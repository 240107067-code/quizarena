# End-to-end test: teacher + 2 phones against the real backend (make run first).
# Run: python3 e2e/test_full_game.py
from playwright.sync_api import sync_playwright
B='http://localhost:8091/'
def P(*a): print(*a)
with sync_playwright() as p:
    br=p.chromium.launch(); errs=[]
    def page(w,h,name):
        pg=br.new_context(viewport={'width':w,'height':h}).new_page(); pg.on('pageerror',lambda e:errs.append(name+':'+str(e))); pg.on('console',lambda m: errs.append(name+':console:'+m.text) if m.type=='error' else None); return pg
    h=page(1280,720,'host')
    h.goto(B+'#/register'); h.wait_for_timeout(500)
    h.fill('input[name=name]','Aigerim'); h.fill('input[name=email]','aigerim@sdu.kz'); h.fill('input[name=password]','password123'); h.click('button:has-text("Create account")'); h.wait_for_timeout(800)
    P('after register:', h.url.split('#')[1], '| empty:', h.inner_text('main')[:80].replace('\n',' '))
    h.click('text=+ New quiz'); h.wait_for_timeout(400)
    h.click('text=Save quiz'); h.wait_for_timeout(300); P('empty save error:', h.inner_text('.error'))
    h.fill('input[name=title]','Capitals')
    h.fill('[aria-label="Question 1 text"]','Capital of Kazakhstan?')
    for k,v in enumerate(['Almaty','Astana','Shymkent','Turkistan']): h.fill(f'[aria-label="Question 1 answer {k+1}"]',v)
    h.check('[aria-label="Answer 2 is correct"]')
    h.click('text=+ Add question'); h.fill('[aria-label="Question 2 text"]','Capital of France?')
    for k,v in enumerate(['Paris','Lyon','Nice','Lille']): h.fill(f'[aria-label="Question 2 answer {k+1}"]',v)
    h.locator('[aria-label="Time limit"]').nth(1).select_option('10')
    h.click('text=Save quiz'); h.wait_for_timeout(800); P('saved ->', h.url.split('#')[1], '|', h.inner_text('.grid').replace('\n',' | '))
    h.click('text=Edit'); h.wait_for_timeout(700); P('edit loaded:', h.input_value('input[name=title]'), h.input_value('[aria-label="Question 2 answer 1"]'), 'correct q1=', h.is_checked('[aria-label="Answer 2 is correct"]'))
    h.click('text=Cancel'); h.wait_for_timeout(400)
    h.click('text=▶ Host'); h.wait_for_timeout(1200); pin=h.inner_text('[data-testid=pin]'); P('pin', pin, 'join url:', h.inner_text('.joinurl'))
    a=page(360,740,'aru'); d=page(360,740,'dana')
    a.goto(B+'#/join/'+pin); a.wait_for_timeout(700); P('join page quiz title:', a.inner_text('.joinbox').replace('\n',' | '))
    a.fill('input[name=nickname]','Aru'); a.click('text=Enter'); a.wait_for_timeout(800)
    d.goto(B+'#/join'); d.wait_for_timeout(400); d.fill('input[name=pin]',pin); d.fill('input[name=nickname]','aru'); d.click('text=Enter'); d.wait_for_timeout(700); P('dup nick:', d.inner_text('.error'))
    d.fill('input[name=nickname]','Dana'); d.click('text=Enter'); d.wait_for_timeout(800)
    h.wait_for_timeout(900); P('lobby chips:', h.inner_text('.chips').replace('\n',','))
    h.click('text=Start ▶'); h.wait_for_timeout(1300)
    P('host q:', h.inner_text('.qcard'), 'timer', h.inner_text('[data-testid=timer]'), '| phone timer', a.inner_text('[data-testid=ptimer]'))
    a.click('[aria-label="Answer 2"]'); a.wait_for_timeout(500); P('aru after answer:', a.inner_text('.phone-msg').replace('\n',' '))
    # dana does not answer -> wait for the 20 s timer
    h.wait_for_timeout(21500); P('host after timeout:', h.inner_text('.stage-info').replace('\n',' '))
    P('dana phone:', d.inner_text('.phone-msg').replace('\n',' '))
    # reload phone mid game
    a.reload(); a.wait_for_timeout(1200); P('aru after reload:', a.inner_text('body')[:120].replace('\n',' '))
    h.click('text=Next ▶'); h.wait_for_timeout(1200)
    d.click('[aria-label="Answer 1"]'); a.click('[aria-label="Answer 1"]'); h.wait_for_timeout(2000)
    P('Q2 host:', h.inner_text('.stage-info').replace('\n',' '))
    h.click('text=Results 🏆'); h.wait_for_timeout(1300); P('podium:', h.inner_text('.podium').replace('\n',' '))
    P('aru final:', a.inner_text('.phone-msg').replace('\n',' '), '| dana final:', d.inner_text('.phone-msg').replace('\n',' '))
    h.click('text=Open report'); h.wait_for_timeout(1000); P('report:', h.inner_text('main').replace('\n',' | ')[:350])
    h.goto(B+'#/games'); h.wait_for_timeout(800); P('history:', h.inner_text('main').replace('\n',' | ')[:200])
    P('ERRORS:', errs); br.close()
