use alator::clock::Clock;

#[derive(Debug)]
pub struct SimulationValue(pub f64);

pub trait SimulationState {
    fn update(&mut self);
    fn get_state(&mut self) -> SimulationValue;
}

pub struct SimRunner<T: SimulationState> {
    pub clock: Clock,
    pub state: T,
}

impl<T: SimulationState> SimRunner<T> {
    pub fn run(&mut self) -> SimulationValue {
        while self.clock.borrow().has_next() {
            self.clock.borrow_mut().tick();
            self.state.update();
        }
        self.state.get_state()
    }
}
