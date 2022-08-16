use wasm_bindgen::prelude::*;

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        let result = 2 + 2;
        assert_eq!(result, 4);
    }
}
    
#[wasm_bindgen]
pub fn add(a: u32, b: u32) -> u32 {
    a + b
}