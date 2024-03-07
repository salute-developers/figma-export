/**
 * Здесь экспортируется svg иконки.
 */
export const getExportSvg = async (selection: SceneNode) => {
    const svgSource = await selection.exportAsync({
        format: 'SVG',
    });

    return String.fromCharCode.apply(null, Array.from(svgSource));
};
