// Visualizacao dedicada do conjunto do botao ESCOLTA.
// Use "montadas" para entender a montagem e "separadas" para ver os STL.
modo = "montadas"; // [montadas,separadas]

$fn = 56;

lid_thickness = 2.4;
lid_hole = 4.8;
head_height = 2.2;
head_rest_gap = 0.4;
retainer_height = 1.2;

module botao_impresso_em_posicao() {
    // Inverte a orientacao de impressao do STL e coloca a cabeca sobre a tampa.
    translate([0, 0, lid_thickness + head_rest_gap])
        rotate([180, 0, 0])
            translate([0, 0, -head_height])
                import("escolta_botao_reforcado_v2_2.stl", convexity = 10);
}

module tampa_demonstrativa() {
    color([0.20, 0.58, 0.86, 0.32])
        difference() {
            translate([-11, -11, 0]) cube([22, 22, lid_thickness]);
            translate([0, 0, -0.1])
                cylinder(h = lid_thickness + 0.2, d = lid_hole);
        }
}

module botao_eletronico_aproximado() {
    // Corpo 5,5 x 5,5 x 4 mm e atuador central. As quatro pernas sao apenas
    // referencia visual; solda e fios reais precisam ser medidos na montagem.
    color([0.08, 0.08, 0.08])
        translate([-2.75, -2.75, -7.8]) cube([5.5, 5.5, 4]);
    color([0.16, 0.16, 0.16])
        translate([0, 0, -3.8]) cylinder(h = 1, d = 3.2);

    color([0.72, 0.74, 0.76]) {
        for (x = [-1.8, 1.8]) {
            translate([x - 0.25, -4.5, -6.8]) cube([0.5, 2, 0.35]);
            translate([x - 0.25, 2.5, -6.8]) cube([0.5, 2, 0.35]);
        }
    }
}

if (modo == "separadas") {
    color([0.92, 0.20, 0.16])
        import("escolta_botao_reforcado_v2_2.stl", convexity = 10);
    color([0.95, 0.65, 0.08])
        translate([15, 0, 0])
            import("escolta_trava_botao_reforcada_v2_2.stl", convexity = 10);
} else {
    tampa_demonstrativa();
    color([0.92, 0.20, 0.16]) botao_impresso_em_posicao();
    color([0.95, 0.65, 0.08])
        translate([0, 0, -retainer_height])
            import("escolta_trava_botao_reforcada_v2_2.stl", convexity = 10);
    botao_eletronico_aproximado();
}
