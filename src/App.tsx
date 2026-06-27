/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { ResultsPage } from './pages/ResultsPage';
import { AboutPage } from './pages/AboutPage';
import { CompareProvider } from './lib/CompareContext';

export default function App() {
  return (
    <CompareProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<ResultsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </CompareProvider>
  );
}

