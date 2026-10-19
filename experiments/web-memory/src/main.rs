mod culling;
mod exact;
mod magnitude;
mod paint;
mod rotation;
mod rotation_culling;
mod viewport;
mod zoom;

use std::io::{self, BufRead};

fn main() {
    // Synthetic line protocol belongs only to this isolated diagnostic executable.
    for (index, line) in io::stdin().lock().lines().enumerate() {
        assert!(index < 4096, "bounded-corpus");
        let line = line.expect("stdin");
        assert!(line.len() <= 512, "bounded-line");
        let fields: Vec<&str> = line.split_whitespace().collect();
        match fields.first().copied() {
            Some("N") => {
                let region = fields[1].parse().expect("synthetic-region");
                let a = fields[2].parse().expect("synthetic-a");
                let b = fields[3].parse().expect("synthetic-b");
                match exact::normalize(region, a, b) {
                    Ok((q, local)) => println!("N {q} {}", local.to_bits()),
                    Err(reason) => println!("E {reason}"),
                }
            }
            Some("P") => paint::observe(&fields[1..]),
            Some("Q") => viewport::observe(&fields[1..]),
            Some("C") => culling::observe(&fields[1..]),
            Some("Z") => zoom::observe(&fields[1..]),
            Some("R") | Some("I") => rotation::observe(&fields[1..], fields[0] == "I"),
            Some("B") => rotation_culling::observe(&fields[1..]),
            _ => panic!("synthetic-operation"),
        }
    }
}
