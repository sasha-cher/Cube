#!/usr/bin/python3
# -*- coding: utf-8 -*-
import pygame
import pygame.locals as lgm
import math as mp
import numpy as np

screen_size = np.array([800, 600])
clean_color = [255, 255, 255, 255]
fps = 24
pygame.font.init()
my_font = pygame.font.SysFont('Liberation Mono', 40)

def draw_pol(r, deg, n, i):
	return r * np.array([np.cos(deg + 2 * np.pi * i / n), np.sin(deg + 2 * np.pi * i / n)])

def draw_fract(p, dep = 3):
	if dep < 0:
		return
	d = []
	for i in range(0, len(p)):
		d += [((p[i-1] + p[i]) / 2).astype(np.int32)]
	draw_fract([p[0], d[0], d[1]], dep-1)
	draw_fract([p[1], d[1], d[2]], dep-1)
	draw_fract([p[2], d[0], d[2]], dep-1)
	gdw.lines(screen, [0, 118, 224], True, p, 2)

def fn_update():
	mouse = np.array(pygame.mouse.get_pos())
	mv = mouse / screen_size
	r = 200
	uv = screen_size / 2
	n = int(max(3, 16 * mv[1]))
	m = 3+n + int(200 * mv[0])
	angle = 0
	d = []
	for j in range(0, m):
		pd = d
		d = []
		if j > 0:
			r *= np.cos(np.pi / n)
		angle += 180 / n
		for i in range(0, n):
			d += [(uv + draw_pol(r, (90 + angle) * np.pi / 180, n, i)).astype(np.int32)]
		if j > 0:
			for i in range(0, n):
				dd = [pd[i], d[i], d[i-1]]
				draw_fract(dd, 3)
		gdw.lines(screen, [0, 118, 224], True, d, 2)
	text_surface = my_font.render('n = ' + str(np.around(n, 2)), True, [0, 118, 224])
	text_surface2 = my_font.render('m = ' + str(m), True, [0, 118, 224])
	screen.blit(text_surface, (20,20))
	screen.blit(text_surface2, (20,80))

if __name__ == "__main__":
	pygame.init()
	screen = pygame.display.set_mode(screen_size)
	clock = pygame.time.Clock()
	gdw = pygame.draw
	pygame.display.set_caption("Draw")
	screen.fill(clean_color)
	cycles = True
	while cycles:
		screen.fill(clean_color)
		fn_update()
		for event in pygame.event.get():
			pygame.display.update()
			if event.type == lgm.QUIT or (event.type == lgm.KEYDOWN and event.key == lgm.K_ESCAPE):
				cycles = False
		pygame.display.flip()
		clock.tick(fps)
	pygame.quit()
